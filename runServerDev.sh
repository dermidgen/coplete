#!/bin/sh
uglifyjs2 -d DEBUG=false ClientSrc.js > Client.js
csso StyleSrc.css > Style.css
node socket.js dev
