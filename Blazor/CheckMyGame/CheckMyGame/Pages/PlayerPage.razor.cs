using DotNetBungieAPI.Models;
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

    private GroupV2 _playerGroupV2 = new GroupV2();

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

        if (response.Response.Results.Count > 0)
        {
            _playerGroupV2 = response.Response.Results[0].Group;
        }
    }
}