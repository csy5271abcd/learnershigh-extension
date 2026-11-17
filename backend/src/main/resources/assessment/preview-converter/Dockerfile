# 평가계획서 HWP·HWPX → PDF 미리보기 변환기 (A25, 2026-11-17 · A26: Backend가 이 파일로 이미지를 자동 준비).
# 이미지 Tag = lh-plan-preview-converter:<이 파일 SHA-256 앞 12자> — 내용이 바뀌면 새 이미지를 만든다. Build Context가 필요 없다(docker build -).
# LibreOffice(headless, MPL-2.0) + H2Orestart 0.8.0(HWP 5.x·HWPX 가져오기 확장, GPL-3.0, 별도 프로세스로만 실행).
# 네트워크 없이(--network none) 한 파일씩 변환하는 일회용 컨테이너로 쓴다. 문서를 외부 서비스로 보내지 않는다.
# 한컴오피스 등 상용 프로그램은 쓰지 않는다. 한글 글꼴은 Nanum·Noto CJK로 대체되므로 원본 글꼴과 줄바꿈이 다를 수 있다.
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    HOME=/tmp/converter-home

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      libreoffice-writer-nogui libreoffice-java-common default-jre-headless \
      fonts-nanum fonts-nanum-extra fonts-noto-cjk curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

ARG H2ORESTART_VERSION=v0.8.0
ARG H2ORESTART_SHA256=f36c19fa6b7dff1cf34114d926bdc088e6bcfa7fdc93d67eaafd3f572be1d62c
RUN curl -fsSL -o /opt/H2Orestart.oxt "https://github.com/ebandal/H2Orestart/releases/download/${H2ORESTART_VERSION}/H2Orestart.oxt" \
 && echo "${H2ORESTART_SHA256}  /opt/H2Orestart.oxt" | sha256sum -c - \
 && mkdir -p /tmp/converter-home \
 && unopkg add --shared /opt/H2Orestart.oxt \
 && apt-get purge -y curl && apt-get autoremove -y

RUN useradd --create-home --uid 10001 converter && mkdir -p /work && chown converter /work
USER converter
WORKDIR /work
ENV HOME=/home/converter

# 사용(Backend가 실행): docker run --rm --network none -v <in>:/work/in:ro -v <out>:/work/out <tag> in/source.hwpx
ENTRYPOINT ["soffice", "--headless", "--norestore", "--nolockcheck", "--convert-to", "pdf", "--outdir", "/work/out"]
