export class SessionDO {
  state: DurableObjectState;
  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    switch (url.pathname) {
      case '/save': {
        const body = await request.json();
        await this.state.storage.put('data', body);
        return new Response('ok');
      }
      case '/load': {
        const data = await this.state.storage.get('data');
        return new Response(JSON.stringify(data || {}), { headers: { 'Content-Type': 'application/json' } });
      }
      default:
        return new Response('not found', { status: 404 });
    }
  }
}
