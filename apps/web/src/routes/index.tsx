import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const [state, setState] = useState("")

  return (
    <div>
      <h1>Home</h1>
      <button 
        onClick={() => {
          fetch("/api/health")
            .then((res) => res.text())
            .then((data) => {
              setState(data)
            });
        }}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md hover:shadow-lg"
      >
        HealthCheck
      </button>

      <div>
        {state === "" ? <h1>Not Healthy</h1> : <h1>Healthy</h1>}
      </div>
    
    </div>
  );
}

export { HomeComponent };