#  Azure Pipelines for Space Game project
[Azure Pipelines](https://docs.microsoft.com/en-us/learn/modules/create-a-build-pipeline/1-introduction)

## Origin repository
[Space Game](https://github.com/MicrosoftDocs/mslearn-tailspin-spacegame-web)

## Forked repository
[yxiao168 / mslearn-tailspin-spacegame-web](https://github.com/yxiao168/mslearn-tailspin-spacegame-web)


## Update to run for dotnet 5.0
Tailspin.SpaceGame.Web/Tailspin.SpaceGame.Web.csproj

## Build and run the web app
```shell
$ dotnet build --configuration Release
Microsoft (R) Build Engine version 16.8.3+39993bd9d for .NET
Copyright (C) Microsoft Corporation. All rights reserved.

  Determining projects to restore...
  Restored /media/WS1/WORK/azure/Learn/mslearn-tailspin-spacegame-web/Tailspin.SpaceGame.Web/Tailspin.SpaceGame.Web.csproj (in 114 ms).
  Tailspin.SpaceGame.Web -> /media/WS1/WORK/azure/Learn/mslearn-tailspin-spacegame-web/Tailspin.SpaceGame.Web/bin/Release/netcoreapp5.0/Tailspin.SpaceGame.Web.dll
  Tailspin.SpaceGame.Web -> /media/WS1/WORK/azure/Learn/mslearn-tailspin-spacegame-web/Tailspin.SpaceGame.Web/bin/Release/netcoreapp5.0/Tailspin.SpaceGame.Web.Views.dll

Build succeeded.
    0 Warning(s)
    0 Error(s)

Time Elapsed 00:00:03.42
$
$
$ dotnet run --configuration Release --no-build --project Tailspin.SpaceGame.Web
warn: Microsoft.AspNetCore.DataProtection.KeyManagement.XmlKeyManager[35]
      No XML encryptor configured. Key {67794de4-cc69-46a8-b81a-3ee593d845b6} may be persisted to storage in unencrypted form.
Hosting environment: Production
Content root path: /media/WS1/WORK/azure/Learn/mslearn-tailspin-spacegame-web/Tailspin.SpaceGame.Web
Now listening on: http://localhost:5000
Now listening on: https://localhost:5001
Application started. Press Ctrl+C to shut down.
```