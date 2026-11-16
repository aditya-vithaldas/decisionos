#!/usr/bin/env bash
# Publish /open-demo-presentation as a static layer over the image currently serving
# decisionaxis.co (same procedure as earlier targeted releases). Run from the repo root
# on a machine where gcloud is signed in.
set -euo pipefail
PROJECT=striking-loop-447915-q3; REGION=europe-west1; SERVICE=chatpm
SHA=$(git rev-parse --short HEAD)-$(date +%H%M)
REPO=$REGION-docker.pkg.dev/$PROJECT/cloud-run-source-deploy/$SERVICE

REV=$(gcloud run services describe $SERVICE --region $REGION --project $PROJECT \
      --format='value(status.traffic[0].revisionName)')
BASE=$(gcloud run revisions describe "$REV" --region $REGION --project $PROJECT \
      --format='value(status.imageDigest)')
echo "Serving revision: $REV"; echo "Base image: $BASE"

CTX=$(mktemp -d)
cp -R open-demo-presentation "$CTX/"
cat > "$CTX/Dockerfile" <<DOCKER
FROM $BASE
USER root
COPY --chown=node:node open-demo-presentation /app/dist/open-demo-presentation
# /open-demo-presentation -> /open-demo-presentation/
RUN grep -q "'/open-demo-presentation'" /app/scripts/serve.mjs || \
    sed -i "s#const redirects = { #const redirects = { '/open-demo-presentation': '/open-demo-presentation/', #" /app/scripts/serve.mjs && \
    grep -q "'/open-demo-presentation'" /app/scripts/serve.mjs && node --check /app/scripts/serve.mjs
USER node
DOCKER
IMAGE=$REPO:open-demo-$SHA
gcloud builds submit "$CTX" --tag "$IMAGE" --project $PROJECT
gcloud run deploy $SERVICE --image "$IMAGE" --region $REGION --project $PROJECT \
  --no-traffic --tag open-demo-$SHA --revision-suffix open-demo-$SHA
NEW=$SERVICE-open-demo-$SHA
URL=$(gcloud run services describe $SERVICE --region $REGION --project $PROJECT \
      --format="value(status.traffic.filter(tag=open-demo-$SHA).url)" 2>/dev/null || true)
[ -z "$URL" ] && URL=$(gcloud run services describe $SERVICE --region $REGION --project $PROJECT --format=json | \
      python3 -c "import json,sys;t=[x for x in json.load(sys.stdin)['status']['traffic'] if x.get('tag')=='open-demo-$SHA'];print(t[0]['url'])")
echo "Preview: $URL"
fail=0
for p in /health / /open-demo-presentation/ /open-demo-presentation/film.html /open-demo-presentation/app.html; do
  c=$(curl -s -o /dev/null -w '%{http_code}' "$URL$p"); echo "$p $c"; [ "$c" = 200 ] || fail=1; done
c=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' "$URL/open-demo-presentation"); echo "/open-demo-presentation $c"; case "$c" in 301*open-demo-presentation/) ;; *) fail=1;; esac
if [ $fail = 1 ]; then echo "Preview checks failed; production traffic unchanged."; exit 1; fi
gcloud run services update-traffic $SERVICE --region $REGION --project $PROJECT --to-revisions "$NEW=100"
echo "Live: https://decisionaxis.co/open-demo-presentation  (revision $NEW, image $IMAGE)"
