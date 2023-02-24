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
    private string _inputName;
    // Current guardians identified while autocompleting
    private Dictionary<string, UserSearchResponseDetail> _currentSelection;

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

        // Check for only letter, numbers, underscores, whitespaces in prefix
        if (!Regex.IsMatch(names[0], @"^[a-zA-Z0-9_\s]+$"))
        {
            return false;
        }

        // Check for only number in suffix
        if (names.Length > 1 && !Regex.IsMatch(names[0], @"^[0-9]+$"))
        {
            return false;
        }

        return true;
    }

    private async Task<IEnumerable<string>> SearchGuardian(string guardianName)
    {
        if (!IsNameValid(guardianName))
        {
            return Array.Empty<string>();
        }

        string prefix = guardianName.Split('#')[0];

        // Request Bungie api
        UserSearchPrefixRequest requestBody = new UserSearchPrefixRequest(prefix);

        BungieResponse<UserSearchResponse> response =
            await BungieClient.ApiAccess.User.SearchByGlobalNamePost(requestBody);

        // Store response in _currentSelection
        _currentSelection = response.Response.SearchResults.ToDictionary(
            g => g.BungieGlobalDisplayName + "#" + g.BungieGlobalDisplayNameCode,
            g => g
        );

        return _currentSelection.Select(kvp => kvp.Key).ToArray();
    }
}