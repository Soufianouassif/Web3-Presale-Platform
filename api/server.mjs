// Vercel Serverless Function — imports the pre-built Express app bundle.
// The api-server is compiled by esbuild before this runs (see vercel.json buildCommand).
export { default } from '../artifacts/api-server/dist/app.mjs';
