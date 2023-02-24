using System.Text.RegularExpressions;
using DotNetBungieAPI.Models;
using DotNetBungieAPI.Models.Requests;
using DotNetBungieAPI.Models.User;
using Microsoft.AspNetCore.Components;

namespace CheckMyGame.Components;

public partial class SearchPlayerComponent : ComponentBase
{
    // Constants
    private const int MinimumNameLength = 3;

    // Current input value in autocomplete
    private string _inputName = "";
    
    // Current guardians identified while autocompleting
    private Dictionary<string, UserSearchResponseDetail> _currentSelection = new();

    /// <summary>
    /// Regex on the name provided to check if it is a valid bungie name.
    /// </summary>
    /// <param name="guardianName"></param>
    /// <returns></returns>
    private bool IsNameValid(string guardianName)
    {
        if (guardianName.Length < MinimumNameLength)
        {
            return false;
        }

        string[] names = guardianName.Split('#');

        // Multiple #
        if (names.Length is 0 or > 2)
        {
            return false;
        }
        
        Console.WriteLine(names[0]);

        // Check for only letter, numbers, underscores, whitespaces in prefix
        if (!Regex.IsMatch(names[0], @"^[a-zA-Z0-9_\s]+$"))
        {
            return false;
        }

        // Check for only number in suffix
        if (names.Length > 1 && names[1].Length > 0 && !Regex.IsMatch(names[1], @"^[0-9]+$"))
        {
            return false;
        }

        return true;
    }

    /// <summary>
    /// Request bungieApi to fetch guardian matching the given prefix.
    /// </summary>
    /// <param name="guardianName"></param>
    /// <param name="token"></param>
    /// <returns></returns>
    private async Task<IEnumerable<string>> SearchGuardianByPrefix(string guardianName, CancellationToken token)
    {
        // Check if name valid
        if (!IsNameValid(guardianName))
        {
            return Array.Empty<string>();
        }

        string prefix = guardianName.Split('#')[0];

        // Request Bungie api
        // TODO: disable rate limit log errors in console
        UserSearchPrefixRequest requestBody = new UserSearchPrefixRequest(prefix);
        BungieResponse<UserSearchResponse> response =
            await BungieClient.ApiAccess.User.SearchByGlobalNamePost(requestBody, 0, token);
        _currentSelection = response.Response.SearchResults.ToDictionary(
            g => g.BungieGlobalDisplayName + "#" + g.BungieGlobalDisplayNameCode,
            g => g
        );

        return _currentSelection.Select(kvp => kvp.Key).ToArray();
    }
}