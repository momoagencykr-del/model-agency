import { useState, useEffect } from "react";
import App from "./App";
import ProjectApp from "./ProjectApp";

function getRouteFromHash() {
  return window.location.hash === "#projects" ? "projects" : "settlement";
}

export default function Root() {
  var [route, setRoute] = useState(getRouteFromHash());

  useEffect(function () {
    var onHashChange = function () { setRoute(getRouteFromHash()); };
    window.addEventListener("hashchange", onHashChange);
    return function () { window.removeEventListener("hashchange", onHashChange); };
  }, []);

  if (route === "projects") return <ProjectApp />;
  return <App />;
}
