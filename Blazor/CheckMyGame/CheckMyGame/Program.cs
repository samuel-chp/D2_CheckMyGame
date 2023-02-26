using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using CheckMyGame;
using CheckMyGame.Utilities;
using MudBlazor.Services;
using DotNetBungieAPI;
using DotNetBungieAPI.DefinitionProvider.Sqlite;
using DotNetBungieAPI.Extensions;
using DotNetBungieAPI.Models;
using DotNetBungieAPI.Models.Applications;
using DotNetBungieAPI.Service.Abstractions;
using Microsoft.JSInterop;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

builder.Services.AddScoped(sp => new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) });

// Bungie API DotNet
builder.Services.UseBungieApiClient(bungieClient =>
{
    // TODO: edit config from file
    bungieClient.ClientConfiguration.ApiKey = "d1afcba184f644bdb4a4bb4a09e51e50";
    bungieClient.ClientConfiguration.ApplicationScopes = ApplicationScopes.ReadUserData;
    bungieClient.ClientConfiguration.CacheDefinitions = true;
    bungieClient.ClientConfiguration.ClientId = 39241;
    bungieClient.ClientConfiguration.ClientSecret = "2rPXZB8K2Cv9-TJ4gMh8GX1EIKYjoBUPmrSedWg66gU";
    bungieClient.ClientConfiguration.UsedLocales.Add(BungieLocales.EN);
    // bungieClient.DefinitionProvider.UseSqliteDefinitionProvider(definitionProvider =>
    // {
    //     definitionProvider.ManifestFolderPath = "D:/GameDev/D2_CheckMyGame/Blazor/CheckMyGame/CheckMyGame/Manifests";
    //     definitionProvider.AutoUpdateManifestOnStartup = true;
    //     definitionProvider.FetchLatestManifestOnInitialize = true;
    //     definitionProvider.DeleteOldManifestDataAfterUpdates = true;
    // });
    bungieClient.DotNetBungieApiHttpClient.ConfigureDefaultHttpClient(options =>
    {
        // options.SetRateLimitSettings(20, TimeSpan.FromSeconds(1));
        // options.MaxRequestsPerSecond = 20;
    });
});

// Mud blazor
builder.Services.AddMudServices();

// Test
builder.Services.AddSingleton<IndexedDBDefinitionProvider>(serviceProvider =>
    new(serviceProvider.GetRequiredService<IJSRuntime>(), "CheckMyGame", 0.1f));

await builder.Build().RunAsync();