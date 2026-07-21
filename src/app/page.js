import React, { Suspense } from "react";
import Login from "./components/Login.jsx";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  );
}
