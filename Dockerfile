FROM nginx:alpine

WORKDIR /usr/share/nginx/html

COPY index.html .
COPY styles.css .
COPY script.js .
COPY jszip.min.js .
COPY fr.png .
COPY en-us.png .

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 