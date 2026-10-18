# Contenedor para revisar los Word de los avances sin LibreOffice en el equipo:
# convierte el .docx a PDF y saca una imagen por página.
#   docker build -t acopio-render -f render.Dockerfile .
#   docker run --rm -v "$PWD":/data acopio-render sh -c \
#     'soffice --headless --convert-to pdf "Avance 5 - Sprint 2 - Acopio.docx" && pdftoppm -r 60 -png "Avance 5 - Sprint 2 - Acopio.pdf" pagina'
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends libreoffice-writer-nogui poppler-utils imagemagick fonts-noto-core fonts-dejavu-core && rm -rf /var/lib/apt/lists/*
WORKDIR /data
