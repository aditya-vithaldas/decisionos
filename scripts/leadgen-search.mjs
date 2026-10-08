import { postPlatform } from './leadgen-urls.mjs';

// Separate searches prevent a single broad answer from skipping a platform.
export async function searchPlatforms(research, instruction, input, onProgress = () => {}) {
  const searches = await Promise.allSettled(input.queries.map(async query => {
    onProgress({ platform: query.platform, status: 'searching' });
    try {
      let result, initialError;
      try { result = await research(
        `${instruction}\nThis request covers ONLY ${query.platform}. Use concise problem phrases with the site filters, rather than joining every full question into one long query. Paraphrase each question briefly, at most 30 words, without quoting post text. Replies do not necessarily mean a question has been solved.`,
        { profile: input.profile, queries: [query], today: input.today, since: input.since }, true,
      ); } catch (error) { if (!input.since) throw error; initialError = error; result = { sources: [], suggestions: '' }; }
      if (input.since && result.sources.filter(source => postPlatform(source.url) === query.platform).length < 10) {
        onProgress({ platform: query.platform, status: 'expanding' });
        try {
          const more = await research(`${instruction}\nThis follow-up covers ONLY ${query.platform}. Search additional relevant communities and alternate short problem phrases to find up to ten distinct recent questions. Exclude the already cited URLs. Keep the same date window and relevance requirements. Cite original posting dates.`, { profile: input.profile, queries: [query], today: input.today, since: input.since, excludeURLs: result.sources.map(source => source.url) }, true);
          const sources = new Map(result.sources.map(source => [source.url, source]));
          for (const source of more.sources) if (!sources.has(source.url)) sources.set(source.url, source);
          result = { sources: [...sources.values()], suggestions: (result.suggestions || '') + (more.suggestions || '') };
        } catch (error) { if (initialError) throw error; result.limited = true; onProgress({ platform: query.platform, status: 'limited' }); }
      }
      onProgress({ platform: query.platform, status: result.limited ? 'limited' : 'done', sourceCount: result.sources.filter(source => postPlatform(source.url) === query.platform).length });
      return result;
    } catch (error) { onProgress({ platform: query.platform, status: 'unavailable' }); throw error; }
  }));
  if (searches.every(search => search.status === 'rejected')) throw Object.assign(new Error('The platform searches could not finish. Please try again.'), { status: 502 });
  return {
    sources: searches.flatMap((search, index) => search.status === 'fulfilled' ? search.value.sources.filter(source => postPlatform(source.url) === input.queries[index].platform) : []),
    suggestions: searches.filter(search => search.status === 'fulfilled').map(search => search.value.suggestions || '').join('').slice(0, 50000),
    limitedPlatforms: searches.flatMap((search, index) => search.status === 'fulfilled' && search.value.limited ? [input.queries[index].platform] : []),
    failedPlatforms: searches.flatMap((search, index) => search.status === 'rejected' ? [input.queries[index].platform] : []),
  };
}
