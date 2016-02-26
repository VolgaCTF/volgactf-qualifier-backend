export default function (request, response, next) {
  let val = request.headers['last-event-id']
  request.lastEventId = (val != null) ? parseInt(val, 10) : null
  next()
}
