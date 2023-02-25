using DotNetBungieAPI.Models;
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

    protected override void OnInitialized()
    {
        base.OnInitialized();
        
        Console.WriteLine("{0} {1} {2} {3}", MembershipType, MembershipId, DisplayName, DisplayNameCode);
    }
}