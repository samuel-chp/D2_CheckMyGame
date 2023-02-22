using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using CheckMyGame;
using CheckMyGame.Utilities;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

builder.Services.AddScoped(sp => new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) });
builder.Services.AddSingleton<BungieHttpClient>();
builder.Services.AddSingleton<BungieAPI>(sp => new(sp.GetRequiredService<BungieHttpClient>()));

await builder.Build().RunAsync();