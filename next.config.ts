import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ffmpeg-static"],
  experimental: {
    // The VPS this deploys to has 2 CPU cores but `next build` was spawning
    // 7 static-generation worker processes anyway, each with its own V8
    // heap — that's what was blowing past available RAM (+ swap) and
    // getting OOM-killed, not the app's actual size. Next's own default is
    // `os.cpus().length - 1`; `cpus` (not staticGenerationMinPagesPerWorker,
    // which only affects when *additional* workers beyond the initial pool
    // are added — confirmed via node_modules/next/dist/build/index.js) is
    // the actual override for the worker pool size.
    cpus: 1,
  },
};

export default nextConfig;
