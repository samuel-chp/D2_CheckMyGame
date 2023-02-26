using DotNetBungieAPI.Models;
using DotNetBungieAPI.Models.Destiny;
using DotNetBungieAPI.Models.Destiny.Config;
using DotNetBungieAPI.Models.Destiny.Definitions.HistoricalStats;
using DotNetBungieAPI.Models.Destiny.Rendering;
using DotNetBungieAPI.Service.Abstractions;

namespace CheckMyGame.Utilities;

public class TestService : IDefinitionProvider
{
    public TestService()
    {
    }

    public string Test()
    {
        Console.WriteLine("Test.");
        return "Test";
    }

    public void Dispose()
    {
        throw new NotImplementedException();
    }

    public async ValueTask DisposeAsync()
    {
        throw new NotImplementedException();
    }

    public async ValueTask<T> LoadDefinition<T>(uint hash, BungieLocales locale) where T : IDestinyDefinition
    {
        throw new NotImplementedException();
    }

    public async ValueTask<DestinyHistoricalStatsDefinition> LoadHistoricalStatsDefinition(string id, BungieLocales locale)
    {
        throw new NotImplementedException();
    }

    public async ValueTask<string> ReadDefinitionRaw(DefinitionsEnum enumValue, uint hash, BungieLocales locale)
    {
        throw new NotImplementedException();
    }

    public async ValueTask<string> ReadHistoricalStatsDefinitionRaw(string id, BungieLocales locale)
    {
        throw new NotImplementedException();
    }

    public async ValueTask<IEnumerable<DestinyManifest>> GetAvailableManifests()
    {
        throw new NotImplementedException();
    }

    public async ValueTask<DestinyManifest> GetCurrentManifest()
    {
        throw new NotImplementedException();
    }

    public async ValueTask<bool> CheckForUpdates()
    {
        throw new NotImplementedException();
    }

    public async Task Update()
    {
        throw new NotImplementedException();
    }

    public async Task DeleteOldManifestData()
    {
        throw new NotImplementedException();
    }

    public async Task DeleteManifestData(string version)
    {
        throw new NotImplementedException();
    }

    public async ValueTask<bool> CheckExistingManifestData(string version)
    {
        throw new NotImplementedException();
    }

    public async Task DownloadManifestData(DestinyManifest manifestData)
    {
        throw new NotImplementedException();
    }

    public async Task Initialize()
    {
        throw new NotImplementedException();
    }

    public async Task ChangeManifestVersion(string version)
    {
        throw new NotImplementedException();
    }

    public async ValueTask ReadToRepository(IDestiny2DefinitionRepository repository)
    {
        throw new NotImplementedException();
    }

    public async ValueTask<DestinyGearAssetDefinition> GetGearAssetDefinition(uint itemHash)
    {
        throw new NotImplementedException();
    }
}