export async function runTinyFishAgent(url: string, goal: string): Promise<any> {
  // Use synchronous endpoint - simpler, no SSE parsing needed
  const response = await fetch("https://agent.tinyfish.ai/v1/automation/run", {
    method: "POST",
    headers: {
      "X-API-Key": process.env.TINYFISH_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, goal }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("TinyFish API error:", response.status, errorText);
    throw new Error(`TinyFish API error: ${response.status}`);
  }

  const run = await response.json();
  
  // Log the response structure for debugging
  console.log("TinyFish response keys:", Object.keys(run));
  console.log("TinyFish status:", run.status);

  // Check if completed successfully
  if (run.status === "COMPLETED" || run.status === "completed") {
    // Try all possible result fields
    if (run.result) return run.result;
    if (run.resultJson) return run.resultJson;
    if (run.result_json) return run.result_json;
    if (run.data) return run.data;
    if (run.output) return run.output;
    return run;
  }

  // If status is not completed but we have data
  if (run.result) return run.result;
  if (run.resultJson) return run.resultJson;
  if (run.result_json) return run.result_json;
  if (run.data) return run.data;
  if (run.output) return run.output;

  // Log full response if nothing matched
  console.log("TinyFish full response:", JSON.stringify(run).slice(0, 500));
  
  // Return the whole response as last resort
  return run;
}
