// vite.config.ts
import { defineConfig } from "file:///workspaces/chatgpt-web/node_modules/vite/dist/node/index.js";
import { svelte } from "file:///workspaces/chatgpt-web/node_modules/@sveltejs/vite-plugin-svelte/src/index.js";
import dsv from "file:///workspaces/chatgpt-web/node_modules/@rollup/plugin-dsv/dist/es/index.js";
import purgecss from "file:///workspaces/chatgpt-web/node_modules/@fullhuman/postcss-purgecss/lib/postcss-purgecss.js";
var plugins = [svelte(), dsv()];
var vite_config_default = defineConfig(({ command, mode, ssrBuild }) => {
  if (command === "build") {
    return {
      plugins,
      css: {
        postcss: {
          plugins: [
            purgecss({
              content: ["./**/*.html", "./**/*.svelte"],
              safelist: ["pre", "code"]
            })
          ]
        }
      },
      base: "./"
    };
  } else {
    return {
      plugins
    };
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvd29ya3NwYWNlcy9jaGF0Z3B0LXdlYlwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL3dvcmtzcGFjZXMvY2hhdGdwdC13ZWIvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL3dvcmtzcGFjZXMvY2hhdGdwdC13ZWIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHsgc3ZlbHRlIH0gZnJvbSAnQHN2ZWx0ZWpzL3ZpdGUtcGx1Z2luLXN2ZWx0ZSdcbmltcG9ydCBkc3YgZnJvbSAnQHJvbGx1cC9wbHVnaW4tZHN2J1xuXG5pbXBvcnQgcHVyZ2Vjc3MgZnJvbSAnQGZ1bGxodW1hbi9wb3N0Y3NzLXB1cmdlY3NzJ1xuXG5jb25zdCBwbHVnaW5zID0gW3N2ZWx0ZSgpLCBkc3YoKV1cblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBjb21tYW5kLCBtb2RlLCBzc3JCdWlsZCB9KSA9PiB7XG4gIC8vIE9ubHkgcnVuIFB1cmdlQ1NTIGluIHByb2R1Y3Rpb24gYnVpbGRzXG4gIGlmIChjb21tYW5kID09PSAnYnVpbGQnKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHBsdWdpbnMsXG4gICAgICBjc3M6IHtcbiAgICAgICAgcG9zdGNzczoge1xuICAgICAgICAgIHBsdWdpbnM6IFtcbiAgICAgICAgICAgIHB1cmdlY3NzKHtcbiAgICAgICAgICAgICAgY29udGVudDogWycuLyoqLyouaHRtbCcsICcuLyoqLyouc3ZlbHRlJ10sXG4gICAgICAgICAgICAgIHNhZmVsaXN0OiBbJ3ByZScsICdjb2RlJ11cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgYmFzZTogJy4vJ1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4ge1xuICAgICAgcGx1Z2luc1xuICAgIH1cbiAgfVxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBdVAsU0FBUyxvQkFBb0I7QUFDcFIsU0FBUyxjQUFjO0FBQ3ZCLE9BQU8sU0FBUztBQUVoQixPQUFPLGNBQWM7QUFFckIsSUFBTSxVQUFVLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztBQUdoQyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLFNBQVMsTUFBTSxTQUFTLE1BQU07QUFFM0QsTUFBSSxZQUFZLFNBQVM7QUFDdkIsV0FBTztBQUFBLE1BQ0w7QUFBQSxNQUNBLEtBQUs7QUFBQSxRQUNILFNBQVM7QUFBQSxVQUNQLFNBQVM7QUFBQSxZQUNQLFNBQVM7QUFBQSxjQUNQLFNBQVMsQ0FBQyxlQUFlLGVBQWU7QUFBQSxjQUN4QyxVQUFVLENBQUMsT0FBTyxNQUFNO0FBQUEsWUFDMUIsQ0FBQztBQUFBLFVBQ0g7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLE1BQ0EsTUFBTTtBQUFBLElBQ1I7QUFBQSxFQUNGLE9BQU87QUFDTCxXQUFPO0FBQUEsTUFDTDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
