import React, { lazy } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import ChaiBuilderCustom from "./EditorCustom.tsx";

async function enableMocking() {
  if (import.meta.env.MODE !== "development") {
    return;
  }

  // const { worker } = await import("./__dev/mock/browser");

  // `worker.start()` returns a Promise that resolves
  // once the Service Worker is up and ready to intercept requests.
  return true;
}

const ChaiBuilderDefault = lazy(() => import("./Editor.tsx"));
const ChaiBuilderEmail = lazy(() => import("./EmailBuilder.tsx"));
const ChaiStudio = lazy(() => import("./ChaiStudio.tsx"));
const Preview = lazy(() => import("./Preview.tsx"));
const RJSF = lazy(() => import("./RJSF.tsx"));

const router = createBrowserRouter([
  {
    path: "/",
    element: <ChaiBuilderDefault />,
  },
  {
    path: "/custom",
    element: <ChaiBuilderCustom />,
  },
  {
    path: "/preview",
    element: <Preview />,
  },
  {
    path: "/email",
    element: <ChaiBuilderEmail />,
  },
  {
    path: "/studio",
    element: <ChaiStudio />,
  },
  {
    path: "/rjsf",
    element: <RJSF />,
  },
]);

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  );
});
