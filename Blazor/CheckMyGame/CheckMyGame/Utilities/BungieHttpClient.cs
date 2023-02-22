namespace CheckMyGame.Utilities;

public class BungieHttpClient : HttpClient
{
    public BungieHttpClient()
    {
        BaseAddress = new Uri(BungieAPI.Endpoint);
    }
}