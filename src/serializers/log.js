
export default function(log) {
  return {
    id: log.id,
    event: log.event,
    createdAt: log.createdAt.getTime(),
    data: log.data
  }
}
