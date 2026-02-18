import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://emxfveprfanfzykuwqog.supabase.co'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVteGZ2ZXByZmFuZnp5a3V3cW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NDMzNDIsImV4cCI6MjA4NjIxOTM0Mn0.HcpGD9CNyYkVUwMsm3nT4PeLddGFq1IwhLbGOb9ElKU'),
    'import.meta.env.VITE_SUPABASE_PROJECT_ID': JSON.stringify('emxfveprfanfzykuwqog'),
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query"],
    force: true,
  },
}));
