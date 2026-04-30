export async function POST() {
  return Response.json({ error: 'Rota não utilizada' }, { status: 404 })
}
