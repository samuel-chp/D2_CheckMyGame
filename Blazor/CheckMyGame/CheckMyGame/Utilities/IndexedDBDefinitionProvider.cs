using DotNetBungieAPI.Models;
using DotNetBungieAPI.Models.Destiny;
using DotNetBungieAPI.Models.Destiny.Config;
using DotNetBungieAPI.Models.Destiny.Definitions.HistoricalStats;
using DotNetBungieAPI.Models.Destiny.Rendering;
using DotNetBungieAPI.Service.Abstractions;
using Microsoft.JSInterop;
using Newtonsoft.Json;

namespace CheckMyGame.Utilities;

public class IndexedDBDefinitionProvider : IDefinitionProvider, IDisposable, IAsyncDisposable
{
    public IJSRuntime JS { get; set; }

    public string DbName { get; set; }

    public float DbVersion { get; set; }

    public Lazy<IJSObjectReference> IndexedDBAccessorModule { get; set; }
    private Lazy<IJSObjectReference> IndexedDBAccessor { get; set; }

    public IndexedDBDefinitionProvider(IJSRuntime JS, string dbName, float dbVersion)
    {
        this.JS = JS;
        DbName = dbName;
        DbVersion = dbVersion;
    }

    public async Task Initialize()
    {
        Console.WriteLine("C'est moi, je m'initialise!");

        // Init JS DBAccessor
        IndexedDBAccessorModule =
            new(await JS.InvokeAsync<IJSObjectReference>("import", "./js/IndexedDBAccessor.js"));
        IndexedDBAccessor =
            new(await IndexedDBAccessorModule.Value.InvokeAsync<IJSObjectReference>("BuildIndexedDBAccessor"));

        Dictionary<string, string> objectStores = new Dictionary<string, string>()
        {
            { "Manifests", "ManifestTmpId" }
        };
        await IndexedDBAccessor.Value.InvokeVoidAsync("openDB", 
            JsonConvert.SerializeObject(objectStores));

        return;
    }

    public ValueTask ReadToRepository(IDestiny2DefinitionRepository repository)
    {
        return new ValueTask();
    }

    public ValueTask<DestinyGearAssetDefinition> GetGearAssetDefinition(uint itemHash)
    {
        return new ValueTask<DestinyGearAssetDefinition>();
    }

    public void Test()
    {
        Console.WriteLine("Test IndexedDBDefinitionProvider.");
    }

    #region Dispose

    public void Dispose()
    {
        return;
    }

    public async ValueTask DisposeAsync()
    {
        // Dispose JS objects
        if (IndexedDBAccessorModule.IsValueCreated)
        {
            await IndexedDBAccessorModule.Value.DisposeAsync();
            await IndexedDBAccessor.Value.DisposeAsync();
        }

        return;
    }

    #endregion

    #region Fetch definitions

    public ValueTask<T> LoadDefinition<T>(uint hash, BungieLocales locale) where T : IDestinyDefinition
    {
        return new ValueTask<T>();
    }

    public ValueTask<DestinyHistoricalStatsDefinition> LoadHistoricalStatsDefinition(string id, BungieLocales locale)
    {
        return new ValueTask<DestinyHistoricalStatsDefinition>();
    }

    public ValueTask<string> ReadDefinitionRaw(DefinitionsEnum enumValue, uint hash, BungieLocales locale)
    {
        return new ValueTask<string>();
    }

    public ValueTask<string> ReadHistoricalStatsDefinitionRaw(string id, BungieLocales locale)
    {
        return new ValueTask<string>();
    }

    #endregion

    #region Manifests

    public ValueTask<IEnumerable<DestinyManifest>> GetAvailableManifests()
    {
        return new ValueTask<IEnumerable<DestinyManifest>>();
    }

    public ValueTask<DestinyManifest> GetCurrentManifest()
    {
        return new ValueTask<DestinyManifest>();
    }

    public async Task DeleteOldManifestData()
    {
        return;
    }

    public async Task DeleteManifestData(string version)
    {
        return;
    }

    public ValueTask<bool> CheckExistingManifestData(string version)
    {
        return new ValueTask<bool>();
    }

    public async Task DownloadManifestData(DestinyManifest manifestData)
    {
        return;
    }

    public async Task ChangeManifestVersion(string version)
    {
        return;
    }

    #endregion

    #region Update

    public ValueTask<bool> CheckForUpdates()
    {
        return new ValueTask<bool>();
    }

    public async Task Update()
    {
        return;
    }

    #endregion
}