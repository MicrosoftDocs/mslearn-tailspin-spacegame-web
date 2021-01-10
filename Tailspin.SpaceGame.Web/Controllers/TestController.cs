using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Tailspin.SpaceGame.Web.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TestController : ControllerBase
    {
        private const string TEST_VALUE = "test value";

        public TestController()
        {
           
        }

        [HttpGet()]
        [Route("/acounts/{id}")]
        public async Task<IActionResult> GetAccountById(string id)
        {
            try
            {
                return Ok(TEST_VALUE);
            }
            catch (Exception ex)
            {
                return RedirectToAction("/");
            }
        }
    }
}