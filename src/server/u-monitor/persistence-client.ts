import type { UMonitorPersistencePayload } from "@/server/u-monitor-service";

type PostOptions = {
  fetchImpl?: typeof fetch;
  authToken?: string;
};

export async function postUMonitorPersistencePayload(
  url: string,
  payload: UMonitorPersistencePayload,
  options: PostOptions = {}
) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(options.authToken ? { "x-u-monitor-token": options.authToken } : {})
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`U monitor persistence failed with status ${response.status}`);
  }

  return response.json();
}
