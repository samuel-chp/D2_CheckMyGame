using CheckMyGame.Utilities;
using DotNetBungieAPI.Models.User;
using Microsoft.AspNetCore.Components;
using Microsoft.Data.Sqlite;

namespace CheckMyGame.Pages;

public partial class IndexPage : ComponentBase
{
    protected override void OnInitialized()
    {
        base.OnInitialized();
        IndexedDbDefinitionProvider.Test();
    }

    protected override async Task OnInitializedAsync()
    {
        await IndexedDbDefinitionProvider.Initialize();
    }
}