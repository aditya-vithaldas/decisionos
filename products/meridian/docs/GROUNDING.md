# Low-latency data checks

Production uses one Gemini planning call per uncached question. Independent model review and the additional DuckDB control query are disabled. No background model review is scheduled.

The same planning call produces the structured metric intent and presentation guidance. Local schema/type checks and deterministic SQL compilation remain. Results come from DuckDB, with finite-number checks. Uploads use one planning call and local column, filter, and aggregation validation. These checks do not independently establish that the model interpreted the question correctly.

Conversation principles, brief uncertainty notes, and the last five questions remain available. The homepage and other subtrees are unchanged.
