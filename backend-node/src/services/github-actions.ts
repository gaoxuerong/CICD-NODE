export interface TriggerWorkflowInput {
  token: string;
  owner: string;
  repo: string;
  workflowId: string;
  ref: string;
  inputs?: Record<string, string>;
}

export interface WorkflowRun {
  id: number;
  name: string | null;
  html_url: string;
  status: string;
  conclusion: string | null;
  run_started_at: string | null;
  updated_at: string | null;
}

export class GithubApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly responseBody: string,
  ) {
    super(`GitHub API ${status}: ${responseBody}`);
  }
}

export class GithubNetworkError extends Error {
  constructor(
    public readonly path: string,
    public readonly method: string,
    public readonly causeMessage: string,
  ) {
    super(`GitHub network request failed: ${method} ${path}: ${causeMessage}`);
  }
}

async function githubFetch<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? 'GET';
  let res: Response;

  try {
    res = await fetch(`https://api.github.com${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init?.headers ?? {}),
      },
    });
  } catch (err) {
    const cause = err instanceof Error && err.cause instanceof Error ? err.cause.message : undefined;
    const message = err instanceof Error ? err.message : String(err);
    throw new GithubNetworkError(path, method, cause ?? message);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new GithubApiError(res.status, body);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return await res.json() as T;
}

export async function triggerWorkflow(input: TriggerWorkflowInput): Promise<void> {
  await githubFetch<void>(
    input.token,
    `/repos/${input.owner}/${input.repo}/actions/workflows/${input.workflowId}/dispatches`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ref: input.ref,
        inputs: input.inputs ?? {},
      }),
    },
  );
}

export async function getLatestWorkflowRun(input: TriggerWorkflowInput): Promise<WorkflowRun | null> {
  const data = await githubFetch<{ workflow_runs: WorkflowRun[] }>(
    input.token,
    `/repos/${input.owner}/${input.repo}/actions/workflows/${input.workflowId}/runs?branch=${encodeURIComponent(input.ref)}&per_page=1`,
  );

  return data.workflow_runs[0] ?? null;
}

export async function getWorkflowRun(input: {
  token: string;
  owner: string;
  repo: string;
  runId: number;
}): Promise<WorkflowRun> {
  return githubFetch<WorkflowRun>(input.token, `/repos/${input.owner}/${input.repo}/actions/runs/${input.runId}`);
}

export function mapGithubRunStatus(run: Pick<WorkflowRun, 'status' | 'conclusion'>): string {
  if (run.status === 'queued' || run.status === 'waiting' || run.status === 'requested') {
    return 'pending';
  }

  if (run.status === 'in_progress') {
    return 'running';
  }

  if (run.status === 'completed') {
    if (run.conclusion === 'success') return 'success';
    if (run.conclusion === 'cancelled') return 'cancelled';
    if (run.conclusion === 'timed_out') return 'timeout';
    return 'failed';
  }

  return 'pending';
}
