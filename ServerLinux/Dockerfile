FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj and restore first for layer caching
COPY ServerLinux/Motorsharks.ServerLinux.csproj ServerLinux/
RUN dotnet restore ServerLinux/Motorsharks.ServerLinux.csproj

# Copy source
COPY ServerLinux/ ServerLinux/
COPY Client/ Client/

RUN dotnet publish ServerLinux/Motorsharks.ServerLinux.csproj -c Release -o /out

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# App binaries
COPY --from=build /out/ ./

# Static client assets
COPY --from=build /src/Client ./Client

ENV ASPNETCORE_URLS=http://0.0.0.0:8080
ENV MOTORSHARKS_DATA_DIR=/app/data

EXPOSE 8080

ENTRYPOINT ["./Motorsharks.ServerLinux"]

