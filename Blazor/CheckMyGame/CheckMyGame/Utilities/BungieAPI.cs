using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Web;

namespace CheckMyGame.Utilities;

public class BungieAPI
{
    public static string Endpoint = "https://www.bungie.net";
    
    // Services
    private BungieHttpClient BungieClient { get; set; }

    // API Rate
    private DateTime _lastTokenUpdate = DateTime.Now;
    private int _tokens = MaxTokens;
    
    public const int Rate = 20;
    public const int MaxTokens = 20;

    // Bungie Auth
    private readonly string _apiKey;
    
    public BungieAPI(BungieHttpClient client)
    {
        BungieClient = client;
        _apiKey = "d1afcba184f644bdb4a4bb4a09e51e50";
    }

    #region API Rate with Tokens

    private async Task WaitForToken()
    {
        while (_tokens < 1) {
            RefreshTokens();
            await Task.Delay(100);
        }

        _tokens -= 1;
    }

    private void RefreshTokens()
    {
        DateTime now = DateTime.Now;
        double timeSinceUpdate = (now - _lastTokenUpdate).TotalMilliseconds;
        int newTokens = (int) Math.Floor(timeSinceUpdate * Rate);
        if (_tokens + newTokens >= 1) {
            _tokens = Math.Min(_tokens + newTokens, MaxTokens);
            _lastTokenUpdate = now;
        }
    }
    
    

    #endregion

    #region GET and POST wrappers

    private async Task<dynamic?> Get(string path, Dictionary<string, string> searchParams)
    {
        var uri = new Uri(BungieClient.BaseAddress, $"Platform/{path}");
        
        // Add query params
        var uriBuilder = new UriBuilder(uri);
        var query = HttpUtility.ParseQueryString(uriBuilder.Query);
        foreach (KeyValuePair<string,string> searchParam in searchParams)
        {
            query[searchParam.Key] = searchParam.Value;
        }
        uriBuilder.Query = query.ToString();
        uri = new Uri(uriBuilder.ToString());
        
        // Init request
        var request = new HttpRequestMessage(HttpMethod.Get, uri);
        
        // Auth to bungie.net
        request.Headers.Add("X-API-Key", _apiKey);
        
        // Send request
        using var httpResponse = await BungieClient.SendAsync(request);

        // Check success
        if (!httpResponse.IsSuccessStatusCode)
        {
            Console.WriteLine(httpResponse.ReasonPhrase);
            return null;
        }

        return await httpResponse.Content.ReadFromJsonAsync<dynamic>();
    }
    
    private async Task<dynamic?> Post(string path, Dictionary<string, string> data, Dictionary<string, string> searchParams)
    {
        var uri = new Uri(BungieClient.BaseAddress, $"Platform/{path}");
        
        // Add query params
        var uriBuilder = new UriBuilder(uri);
        var query = HttpUtility.ParseQueryString(uriBuilder.Query);
        foreach (KeyValuePair<string,string> searchParam in searchParams)
        {
            query[searchParam.Key] = searchParam.Value;
        }
        uriBuilder.Query = query.ToString();
        uri = new Uri(uriBuilder.ToString());
        
        // Init request
        var request = new HttpRequestMessage(HttpMethod.Post, uri);
        
        // Auth to bungie.net
        request.Headers.Add("X-API-Key", _apiKey);
        
        // Body - Data
        request.Content = new StringContent(JsonSerializer.Serialize(data), Encoding.UTF8, "application/json");

        // Send request
        using var httpResponse = await BungieClient.SendAsync(request);

        // Check success
        if (!httpResponse.IsSuccessStatusCode)
        {
            Console.WriteLine(httpResponse.ReasonPhrase);
            return null;
        }

        return await httpResponse.Content.ReadFromJsonAsync<dynamic>();
    }

    #endregion

    public async Task<dynamic?> Test()
    {
        string membershipType = "3";
        string membershipId = "4611686018476641937";
        
        return await Get($"/Destiny2/{membershipType}/Profile/{membershipId}/", new Dictionary<string, string>
        {
            { "components", "Characters" }
        });
    }
}