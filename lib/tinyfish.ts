export async function runTinyFishAgent(url: string, goal: string): Promise<any> {
  const response = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
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

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const event = JSON.parse(line.slice(6));

          if (event.type === "PROGRESS") {
            console.log(`TinyFish progress: ${event.purpose}`);
          } else if (event.type === "COMPLETE") {
            if (event.status === "COMPLETED") {
              return event.resultJson;
            }
            throw new Error(event.error?.message || "Automation failed");
          }
        } catch (e: any) {
          if (e.message === "Automation failed") throw e;
          // JSON parse error, skip this line
        }
      }
    }
  }

  throw new Error("No result received from TinyFish");
}
