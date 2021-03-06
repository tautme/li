const { brotliDecompressSync } = require('zlib')
const got = require('got')

async function crawl (type, params) {
  const { url, rejectUnauthorized, cookies } = params
  const getType = type !== 'headless' ? 'normal' : 'headless'
  const isLocal = process.env.NODE_ENV === 'testing' || process.env.ARC_LOCAL

  let options = JSON.stringify({ type, url, rejectUnauthorized, cookies })
  options = encodeURIComponent(options)

  const root = isLocal
    ? `http://localhost:${process.env.PORT || 3333}`
    : `http://localhost:${process.env.PORT || 3333}` // FIXME change to prod url
  const path = `${root}/get/${getType}?options=${options}`
  const result = await got(path, {
    retry: 0,
    throwHttpErrors: false
  })
  const { statusCode, body } = result

  if (statusCode === 200) {
    let response = JSON.parse(body)
    if (response.body) {
      response.body = new Buffer.from(response.body, 'base64')
      response.body = brotliDecompressSync(response.body)
    }
    return response
  }
  else {
    let error = `Crawl returned status code: ${statusCode}\n` +
                `Type: ${type} (${getType})\n` +
                `Params: ${JSON.stringify(params, null, 2)}`
    if (body) {
      const response = JSON.parse(body)
      error += `\nGetter error: ${response.error}`
    }
    throw Error(error)
  }
}

// Async client passed to crawl.url functions
async function client (params) {
  let response = await crawl('normal', params)
  // As a convenience, convert the client's body back to a string since we aren't piping to cache
  if (response.body) response.body = response.body.toString()
  return response
}

crawl.client = client
module.exports = crawl
