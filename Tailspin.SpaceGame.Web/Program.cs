using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using System.Net;

namespace TailSpin.SpaceGame.Web
{
    public class Program
    {
        public static void Main(string[] args)
        {
            CreateWebHostBuilder(args).Build().Run();
        }

        public static IWebHostBuilder CreateWebHostBuilder(string[] args) =>
            WebHost.CreateDefaultBuilder(args)
                .UseStartup<Startup>().ConfigureKestrel((context, options) =>
                {
                    // development options for kestrel
                    if (context.HostingEnvironment.IsDevelopment())
                    {
                        options.Listen(IPAddress.Any, 5000);  // http:localhost:5000
                        options.Listen(IPAddress.Any, 44300, listenOptions =>
                        {
                            listenOptions.Protocols = Microsoft.AspNetCore.Server.Kestrel.Core.HttpProtocols.Http1;   // force http1 during dev.
                        });
                    }
                });
    }
}
