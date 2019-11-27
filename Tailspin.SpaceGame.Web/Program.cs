using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Extensions.DependencyInjection;

namespace TailSpin.SpaceGame.Web
{
	public class Program
	{
	public static void Main(string[] args)
	{
		CreateHostBuilder(args).Build().Run();
	}
	
	public static IHostBuilder CreateHostBuilder(string[] args) =>
		Host.CreateDefaultBuilder(args)
			.ConfigureWebHostDefaults(webBuilder =>
			{
				webBuilder.UseStartup<Startup>();
			});
	//	public static void Main(string[] args)
	//	{
	//		CreateHostBuilder(args).Build().Run();
	//	}
	//	public static IHostBuilder CreateHostBuilder(string[] args) =>
	//		Host.CreateDefaultBuilder(args)
	//			.ConfigureWebHostDefaults(webBuilder =>
	//			{
	//				webBuilder.ConfigureKestrel(serverOptions =>
	//				{
	//					// Set properties and call methods on options
	//				})
	//				.UseStartup<Startup>();
	//			});
		//public static IHostBuilder CreateHostBuilder(string[] args) =>
		//	Host.CreateDefaultBuilder(args)
		//		.ConfigureWebHostDefaults(webBuilder =>
		//		{
		//			webBuilder.UseStartup<Startup>();
		//		});
	}
}