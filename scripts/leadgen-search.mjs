import { postPlatform } from './leadgen-urls.mjs';

// Separate searches prevent a single broad answer from skipping a platform.
export async function searchPlatforms(research, instruction, input) {
  const searches = await Promise.allSettled(input.queries.map(query => research(
    `${instruction}\nThis request covers ONLY ${query.platform}. Use concise problem phrases with the site filters, rather than joining every full question into one long query. Paraphrase each question briefly, at most 30 words, without quoting post text. Replies do not necessarily mean a question has been solved.`,
    { profile: input.profile, queries: [query], today: input.today }, true,
  )));
  if (searches.every(search => search.status === 'rejected')) throw Object.assign(new Error('The platform searches could not finish. Please try again.'), { status: 502 });
  return {
    sources: searches.flatMap((search, index) => search.status === 'fulfilled' ? search.value.sources.filter(source => postPlatform(source.url) === input.queries[index].platform) : []),
    suggestions: searches.filter(search => search.status === 'fulfilled').map(search => search.value.suggestions || '').join('').slice(0, 50000),
    failedPlatforms: searches.flatMap((search, index) => search.status === 'rejected' ? [input.queries[index].platform] : []),
  };
}
