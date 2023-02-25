using System.Collections.ObjectModel;
using System.Text.RegularExpressions;
using CheckMyGame.Utilities;
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
    private UserSearchResponseDetail _inputUser = new UserSearchResponseDetail();

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
    private async Task<IEnumerable<UserSearchResponseDetail>> SearchGuardianByPrefix(string guardianName, CancellationToken token)
    {
        // Check if name valid
        if (!IsNameValid(guardianName))
        {
            return Array.Empty<UserSearchResponseDetail>();
        }

        string prefix = guardianName.Split('#')[0];

        // Request Bungie api
        // TODO: disable rate limit log errors in console
        UserSearchPrefixRequest requestBody = new UserSearchPrefixRequest(prefix);
        BungieResponse<UserSearchResponse> response =
            await BungieClient.ApiAccess.User.SearchByGlobalNamePost(requestBody, 0, token);

        return response.Response.SearchResults.ToArray();
    }

    private string DisplayGuardianName(UserSearchResponseDetail user)
    {
        if (user.BungieGlobalDisplayName.Length > 0)
        {
            return user.BungieGlobalDisplayName + "#" + user.BungieGlobalDisplayNameCode;
        }

        return "";
    }

    private async Task SearchGuardianByUser()
    {
        if (_inputUser.BungieGlobalDisplayName.Length == 0)
        {
            return;
        }
        
        ExactSearchRequest request = new ExactSearchRequest()
        {
            DisplayName = _inputUser.BungieGlobalDisplayName,
            DisplayNameCode = _inputUser.BungieGlobalDisplayNameCode
        };
        BungieResponse<ReadOnlyCollection<UserInfoCard>> response = await
            BungieClient.ApiAccess.Destiny2.SearchDestinyPlayerByBungieName(BungieMembershipType.All, request);

        // Handle cross save
        UserInfoCard userInfoCard;
        bool crossSaveEnabled = CrossSaveHandler.IsCrossSaveEnabledForUser(response.Response, out userInfoCard);
        
        // TODO: modal select platform
        
        // Handle public status
        // TODO: handle public status
        if (!userInfoCard.IsPublic)
        {
            Console.WriteLine("This user has its settings set to private.");
        }

        string parameters = WebUtility.ConstructQueryFromParameters(new Dictionary<string, string>()
        {
            {"display_name", userInfoCard.BungieGlobalDisplayName},
            {"display_name_code", userInfoCard.BungieGlobalDisplayNameCode.ToString() ?? ""}
        });
        string path = $"/Player/{(int)userInfoCard.MembershipType}/{userInfoCard.MembershipId}?{parameters}";
        NavigationManager.NavigateTo(path);
    }
    
}