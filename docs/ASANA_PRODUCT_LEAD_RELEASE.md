# AI product leadership and Asana release

Public offering: https://decisionaxis.co/services/ai-product-lead.html
Public article and film: https://decisionaxis.co/projects/asana/
Prototype: https://decisionaxis.co/projects/asana/prototype/

The homepage common-services carousel and case-study collection link to the new service and independent Asana exploration. The article includes all principle numbers, with an early signpost for principle 3 and the full explanation later. The meeting illustration shows notes, Gantt plan changes and assigned tasks. Solo voice uses an interactive Gantt chart instead of a flowchart. The 54-second film has nine six-second scenes, updated illustrations, original instrumental music and no narration or company logos. All published project data is fictional; original logged-in product captures are excluded.

## Source and build

Content source commits: `2cf8f77` and `519bdff`.
Streaming implementation: `f388c2d`.
These commits were pushed and fast-forwarded into main.

Content build: `6ede0da1-79f2-4fe1-b2aa-a56fafb98fa8`, image `sha256:bba1869a6d8fdae11d0b7854127ce99ad66f1be680265a6f06d8bd8b65e0de8a`.
Final streaming build: `128cf5cb-feba-4d1b-944a-0cda3c3993ef`, image `sha256:ce3c2daf52a13d5b0d48e654feae66e94db26624ce0a4dc1cd9a5b14c4aca0b0`.
Cloud Run project `striking-loop-447915-q3`, region `europe-west1`, service `chatpm`, final revision `chatpm-asana-f388c2d`, promoted to 100% traffic.

This is a targeted release over the actual previously serving production image `sha256:27fa9e84e89524cc3d4e3c89073c1f7de36b44ea9dcceb850c4f142c8e26c1b1`. The content layer adds the selected committed public pages and media, updates the homepage/collection and appends discovery metadata. The final layer adds the exact committed video handler and a guarded insertion into the existing production server. Other live applications remain in the base image. This is not a full build of Meridian or all main-branch runtime changes.

The initial preview exposed a large buffered-video response limitation. The final handler streams full responses and supports byte-range requests for seeking, including suffix ranges and 416 responses for invalid ranges. The MP4 duration headers were finalized without re-encoding so the player reports the full 54 seconds immediately.

## Validation

Focused static release build, JavaScript syntax checks, local link/asset checks and Git diff checks passed. The video handler test passed for explicit ranges, suffix ranges, invalid/multiple ranges, HEAD metadata and chunked full responses. Preview HEAD checks returned 200 for health, homepage, service, article, prototype, gallery, video, CRM, goods, analytics, commerce, feedback and leadgen. Preview byte-range checks returned 206 for the first and last 1,024 bytes. Deployed prototype script and illustration bytes matched source. Browser verification confirmed loaded article images, principle order, Gantt interaction and a 1920×1080, 54.004-second playable film without a media error.

The reusable workflow is stored separately at `/Users/aditya/programming/Teardowns/WORKFLOW.md`, outside this repository. Editable production assets remain in `/Users/aditya/programming/Teardowns/Asana`. Neither is silently uploaded in the public bundle. The unrelated local `docs/JEV_PROFILE_2026-10-07.md` remains excluded.

Public-domain checks confirmed the homepage service card, offering, principle 3 signpost, Gantt prototype source and working 206 video range response. The final revision serves 100% of traffic.
