// Mock-server middleware: filter /sharable_users by the `q` query parameter.
// db.json stores sharable_users as { users: [...] } rather than a top-level array,
// so json-server's built-in `?q=` full-text search (array resources only) can't
// reach it — filter it here instead.
module.exports = (req, res, next) => {
  if (req.path === '/sharable_users' && req.query.q) {
    const q = req.query.q.toLowerCase()
    const { db } = req.app
    const { users } = db.get('sharable_users').value()
    res.json({
      users: users.filter(
        (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      ),
    })
    return
  }
  next()
}
