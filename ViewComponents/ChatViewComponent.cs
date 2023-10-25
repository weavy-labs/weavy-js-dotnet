using System.Threading.Tasks;
using Acme.Http;
using Microsoft.AspNetCore.Mvc;

namespace Acme.ViewComponents;

public class ChatViewComponent : ViewComponent {
    public async Task<IViewComponentResult> InvokeAsync(AppResponse model) {
        return View(model);
    }
}
