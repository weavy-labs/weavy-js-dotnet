using System.Threading.Tasks;
using Acme.Models;
using Acme.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Acme.Data;
public class UserAccessor {
    private readonly IHttpContextAccessor _context;
    private readonly AcmeContext _db;
    

    public UserAccessor(IHttpContextAccessor context, AcmeContext db) {
        _context = context;
        _db = db;
    }

    public async Task<User> GetUserAsync() {
        return await _db.Users.AsNoTrackingWithIdentityResolution().FirstOrDefaultAsync(x => x.Id == _context.HttpContext.User.Id());
    }
}
