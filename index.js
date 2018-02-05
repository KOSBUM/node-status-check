const http = require('http')
const fs = require('fs')

const dirname = './requests'
const port = process.env.PORT

function endResponse(responseObject, code, text)
{
	//console.log(`Sending response: ${text}`)
	let contentType = text.includes('<html>') ? 'text/html' : 'text/plain'
	responseObject.writeHead(code, {
		'Content-Length': Buffer.byteLength(text),
		'Content-Type': contentType + '; ' + 'charset=utf-8'
	});
	responseObject.end(text, 'utf8')
}

function pageTemplate(blocks) {
	return `<!DOCTYPE html>
	<html>
	<head>
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<link rel="stylesheet" href="https://code.jquery.com/mobile/1.4.5/jquery.mobile-1.4.5.min.css">
	<script src="https://code.jquery.com/jquery-1.11.3.min.js"></script>
	<script src="https://code.jquery.com/mobile/1.4.5/jquery.mobile-1.4.5.min.js"></script>
	</head>
	<body>

	<div data-role="page" id="pageone">
	  <div data-role="header">
		<h1>Recent status requests</h1>
	  </div>

	  ${blocks}

	  <div data-role="footer">
		<h1>You're welcome!</h1>
	  </div>
	</div> 

	</body>
	</html>`
}

function blockTemplate(title, content) {
	return `<div data-role="main" class="ui-content" style="padding: 0 0 0 1em">
		<div data-role="collapsible">
		  <h1>${title}</h1>
		  <p>${content}</p>
		</div>
	  </div>
	  
	  `
}

function listStatusCalls(responseObject) {
	
	try {
		let items = fs.readdirSync(dirname);
		let blocks = '';
		for (var i = 0; i < items.length; i++) {
			blocks += blockTemplate(items[i], fs.readFileSync(dirname + '/' + items[i]))
		}
		endResponse(responseObject, 200, pageTemplate(blocks))
	} catch (e) {
		endResponse(responseObject, 200, pageTemplate(`<p>Error occured: ${e}</p>`))
	}
}

const requestHandler = (request, response) => {
	//console.log(`Got request: ${request.url}`)
	
	if (request.method == 'GET') {
		listStatusCalls(response)
		return
	}
	
	if (request.method == 'POST') {
		let urlObject = require('url').parse(request.url)
		if (urlObject.pathname == '/status') {
			if (!fs.existsSync(dirname)) {
				fs.mkdirSync(dirname)
			}
			
			let requestData = `${request.url}<br><br>`
			
			for (let headerItem of Object.keys(request.headers).sort()) {
				requestData += `${headerItem}: ${request.headers[headerItem]}<br>`
			}
			requestData += '<br>'
			
			request.on('data', (chunk) => {
				requestData += chunk;
				if (requestData.length > 1e6) {
					request.connection.destroy();
				}
			});
			
			request.on('end', () => {
				let filename = new Date().toISOString()
				filename = filename.replace(/\:/g, '-')
				filename = filename.replace(/\./g, '-')
				fs.writeFileSync(dirname + '/' + filename, requestData)
			});
			
			endResponse(response, 200, '')
			return
		}
	}
	endResponse(response, 404, 'not found')
}

const server = http.createServer(requestHandler);

server.listen(port, (err) => {
	
	if (err) {
		return console.log('bind failed', err)
	}

	console.log(`server is listening on ${port}`)
});
