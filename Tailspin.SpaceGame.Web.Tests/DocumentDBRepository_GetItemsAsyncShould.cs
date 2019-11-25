using System;
using System.Linq;
using System.Collections.Generic;
using System.IO;
using System.Linq.Expressions;
using System.Threading.Tasks;
using NUnit.Framework;
using TailSpin.SpaceGame.Web;
using TailSpin.SpaceGame.Web.Models;

namespace Tests
{
    public class DocumentDBRepository_GetItemsAsyncShould
    {
        private IDocumentDBRepository<Score> _scoreRepository;

        [SetUp]
        public void Setup()
        {
            // throw new Exception("All : " + string.Join(" ",typeof(IDocumentDBRepository<Score>).Assembly.GetManifestResourceNames()));
            // throw new Exception(new FileInfo("..\\..\\..\\..\\Tailspin.SpaceGame.Web\\SampleData\\scores.json").Exists.ToString());
            // using (Stream scoresData = typeof(IDocumentDBRepository<Score>)
            //     .Assembly
            //     // .GetManifestResourceStream("..\\..\\..\\..\\Tailspin.SpaceGame.Web\\SampleData\\scores.json"))
            //     .GetManifestResourceStream("SampleData\\scores.json"))
            // {
            // using(var scoresData = File.Open("../../../../Tailspin.SpaceGame.Web/SampleData/scores.json", FileMode.Open))
            using(var scoresData = File.Open("./SampleData/scores.json", FileMode.Open))
            {
                _scoreRepository = new LocalDocumentDBRepository<Score>(scoresData);
            }
        }

        [TestCase("Milky Way")]
        [TestCase("Andromeda")]
        [TestCase("Pinwheel")]
        [TestCase("NGC 1300")]
        [TestCase("Messier 82")]
        public void FetchOnlyRequestedGameRegion(string gameRegion)
        {
            const int PAGE = 0; // take the first page of results
            const int MAX_RESULTS = 10; // sample up to 10 results

            // Form the query predicate.
            // This expression selects all scores for the provided game region.
            Expression<Func<Score, bool>> queryPredicate = score => (score.GameRegion == gameRegion);

            // Fetch the scores.
            Task<IEnumerable<Score>> scoresTask = _scoreRepository.GetItemsAsync(
                queryPredicate, // the predicate defined above
                score => 1, // we don't care about the order
                PAGE,
                MAX_RESULTS
            );
            IEnumerable<Score> scores = scoresTask.Result;

            // Verify that each score's game region matches the provided game region.
            Assert.That(scores, Is.All.Matches<Score>(score => score.GameRegion == gameRegion));
        }
    }
}