using Microsoft.VisualStudio.TestTools.UnitTesting;
using System;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;
using TailSpin.SpaceGame.Web;
using TailSpin.SpaceGame.Web.Models;

namespace Tailspin.SpaceGame.Tests
{
    [TestClass]
    public class ScoreTest
    {
        private LocalDocumentDBRepository<Score> _scoreRepository;

        public ScoreTest()
        {
            _scoreRepository = new LocalDocumentDBRepository<Score>(@"SampleData/scores.json");
        }

        [DataTestMethod]
        [DataRow("Milky Way")]
        [DataRow("Andromeda")]
        [DataRow("Pinwheel")]
        [DataRow("NGC 1300")]
        [DataRow("Messier 82")]
        public async Task Fetch_Only_Requested_GameRegion(string gameRegion)
        {
            const int PAGE = 0;
            const int MAX_RESULTS = 100;

            Expression<Func<Score, bool>> predicate = score => score.GameRegion == gameRegion;

            var scores = await _scoreRepository.GetItemsAsync(predicate, x => 1, PAGE, MAX_RESULTS);

            Assert.IsTrue(scores.ToList().All(x => x.GameRegion == gameRegion));
        }
    }
}
