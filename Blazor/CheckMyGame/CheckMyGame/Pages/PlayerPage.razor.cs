using DotNetBungieAPI.Extensions;
using DotNetBungieAPI.Models;
using DotNetBungieAPI.Models.Destiny;
using DotNetBungieAPI.Models.Destiny.Components;
using DotNetBungieAPI.Models.Destiny.Definitions.Classes;
using DotNetBungieAPI.Models.Destiny.Responses;
using DotNetBungieAPI.Models.GroupsV2;
using DotNetBungieAPI.Models.Queries;
using Microsoft.AspNetCore.Components;

namespace CheckMyGame.Pages;

public partial class PlayerPage : ComponentBase
{
    [Parameter]
    public BungieMembershipType MembershipType { get; set; }

    [Parameter]
    public long MembershipId { get; set; }

    [Parameter]
    [SupplyParameterFromQuery(Name = "display_name")]
    public string? DisplayName { get; set; }

    [Parameter]
    [SupplyParameterFromQuery(Name = "display_name_code")]
    public int DisplayNameCode { get; set; }

    private GroupV2 _playerGroupV2 = new ();
    private IDictionary<long,DestinyCharacterComponent> _playerCharacters = new Dictionary<long, DestinyCharacterComponent>();

    protected override async Task OnInitializedAsync()
    {
        await SearchGroupV2FromPlayer();
    }

    private async Task SearchGroupV2FromPlayer()
    {
        // Get clan info
        BungieResponse<GetGroupsForMemberResponse> response =
            await BungieClient.ApiAccess.GroupV2.GetGroupsForMember(
                MembershipType,
                MembershipId,
                GroupsForMemberFilter.All,
                GroupType.Clan);

        if (!response.IsSuccessfulResponseCode)
        {
            return;
        }

        if (response.Response.Results.Count > 0)
        {
            _playerGroupV2 = response.Response.Results[0].Group;
        }
    }

    private async Task SearchPlayerProfile()
    {
        BungieResponse<DestinyProfileResponse> response = await BungieClient.ApiAccess.Destiny2.GetProfile(
            MembershipType,
            MembershipId,
            new[] { DestinyComponentType.Characters });

        if (response.IsSuccessfulResponseCode)
        {
            _playerCharacters = response.Response.Characters.Data;
        }
    }

    private async Task SearchPlayerFullActivityHistory()
    {
        // BungieClient.ApiAccess.Destiny2.ac
    }

    private string DisplayCharacter(DestinyCharacterComponent characterComponent)
    {
        // Class type to str
        uint classHash = characterComponent.Class.Hash ?? 0;
        if (classHash == 0)
        {
            return "";
        }

        characterComponent.Class.TryGetDefinition(out var classDef, BungieLocales.EN);
        string classStr = classDef.DisplayProperties.Name;

        // Light level
        int lightLevel = characterComponent.Light;

        // return classStr + " " + lightLevel;
        return classStr + " " + lightLevel.ToString();
    }
}