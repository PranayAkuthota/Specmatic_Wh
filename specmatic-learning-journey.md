# My Journey with Specmatic: Applying Contract-Driven Development to WorkHive

Hi everyone! I recently completed the Specmatic Academy courses and decided to put what I learned into practice. I applied Contract-Driven Development (CDD) and contract testing to a Django project I’ve been working on called **WorkHive**—a multi-tenant workspace and task management app. 

I wanted to share my experience, the technical challenges I ran into, and what I learned along the way. If you've ever dealt with API documentation going out of date or frontend integrations breaking unexpectedly, this might be useful for you.

---

## Understanding Contract-Driven Development

Before this, I usually treated OpenAPI (Swagger) specifications as just documentation—something you write at the end of a project so other developers know how to use your API. But during the Specmatic course, I realized that these specifications can actually be used as executable contracts. 

In Contract-Driven Development, you write the API spec first. Then, instead of writing dozens of integration tests by hand to verify your endpoints, Specmatic reads your OpenAPI files and automatically runs tests against your backend. If your code doesn't match the spec, the tests fail. This approach keeps the frontend and backend teams in sync and catches bugs long before they get merged.

---

## Implementing Specmatic in WorkHive

WorkHive has standard API endpoints to handle user registration, login, tenant creation, managing workspaces, and tracking tasks. 

I split the API contracts into four separate YAML files inside an `api-specs` folder:
* `auth.yaml`
* `tenants.yaml`
* `workspaces.yaml`
* `tasks.yaml`

Once the specifications were ready, I set up Specmatic to target my local Django server. It automatically figured out the endpoints, read my example payloads, and generated contract tests to verify that the responses returned by my Django views perfectly matched the formats defined in the YAML files.

---

## Learning About Resiliency Testing

One of the coolest features I explored was Specmatic's generative resiliency testing. Usually, when we write tests, we focus on the "happy paths"—making sure a valid request returns a `200 OK`. 

By enabling `schemaResiliencyTests: all` in `specmatic.yaml`, Specmatic goes a step further and runs negative tests. It automatically mutates inputs to see if the server breaks. For instance, it will try sending a boolean instead of an integer, leave out required fields, or pass `null` values. This forced me to make sure my API fails gracefully with proper error messages instead of crashing or behaving unpredictably.

---

## Challenges I Faced

Getting all 545 test scenarios to pass wasn't straightforward. I ran into several hurdles where my Django backend was doing things that violated the API contract.

### Contract Discovery Issues
When I first ran the tests in my GitHub Actions CI pipeline, I hit a wall. The runner kept complaining:
> No tests found to run. No test scenarios found.

I realized that Specmatic was looking for a default configuration file. Locally it worked fine, but in the clean CI environment, it couldn't locate my specs. I fixed this by creating a `specmatic.json` file in the root directory that pointed to my specs, and explicitly passing the `--config=specmatic.yaml` flag to the Specmatic CLI in the workflow steps.

### Strict Type-Safety in Serializers
Django REST Framework (DRF) is very forgiving by default. If a client sends an integer like `123` or a boolean like `true` to a string field, DRF silently converts it to `"123"` or `"True"` and saves it. 

However, my OpenAPI spec defined these fields strictly as strings. Specmatic fuzzed these fields with numbers and booleans, expecting a `400 Bad Request` since the types were incorrect. Because Django was auto-coercing them and returning `201 Created`, the tests failed. 

To solve this, I wrote a custom serializer field called `StrictCharField`:

```python
class StrictCharField(serializers.CharField):
    def to_internal_value(self, data):
        if not isinstance(data, str):
            raise serializers.ValidationError("This field must be a string.")
        return super().to_internal_value(data)
```

Using this field in my serializers ensured that Django strictly rejected non-string inputs with a `400` error, making the API contract-compliant.

### Authentication Challenges during Contract Testing
WorkHive secures its endpoints using JWT tokens. This created a problem: Specmatic generates random fuzzed tokens during test runs. Since these random tokens aren't signed with my Django secret key, the backend would reject all requests with a `401 Unauthorized` error. This blocked Specmatic from testing any of the actual view logic.

To make authentication testable, I modified my authentication class to support a signature-free fallback when running tests. It decodes the JWT claims without checking the signature and signs the request in as a mock user. 

But I also had to make sure Specmatic's negative authorization tests still worked. To handle that, the auth class checks if the request has the header `X-Test-Case: unauthorized`. If it does, the backend raises a `401 Unauthorized` as expected.

### Path Parameter Mutation Failures
Specmatic fuzzed the path parameters for retrieving tenants and workspaces. For example, it would request `/tenants/true` (a boolean) or `/workspaces/abc` (a string) instead of `/tenants/1`. 

Because my Django URL configurations were expecting integers (`<int:pk>`), these mutated URLs didn't match any routes. Since `DEBUG` was set to `True` in the CI backend environment, Django returned its default HTML traceback pages. Specmatic expected a JSON response and failed with a parsing error. 

I resolved this by doing two things:
1. Setting `DEBUG = False` in the CI test settings.
2. Creating custom `handler404` and `handler500` views that return JSON error payloads instead of HTML pages.

Now, whenever a URL route is fuzzed, Django returns a clean JSON error that Specmatic can validate.

### OpenAPI Example Warnings
During the test runs, my logs were cluttered with warnings:
> WARNING: Ignoring response example named invalidRequest... because no associated request example... was found.

Specmatic warns you if you define named examples in your responses (like a `400` or `401` error example) but don't provide a matching request example to trigger them. 

To clean this up, I refactored my OpenAPI files. Instead of using named `examples` objects under my responses, I replaced them with a single anonymous `example` key. This matches OpenAPI 3.0 standards and silenced the warnings completely.

---

## GitHub Actions Integration and Compatibility Checks

Once everything passed locally, I set up a GitHub Actions workflow to automate the testing. Every time I push code, the pipeline:
1. Runs my backend unit tests (`pytest`).
2. Starts the Django server in the background.
3. Runs the Specmatic contract and resiliency tests.
4. Performs a backward compatibility check.

The backward compatibility check is incredibly useful. It compares my current OpenAPI specs against the `main` branch to make sure I haven't accidentally renamed a field, deleted a path, or added a required parameter that could break existing client applications.

---

## Key Takeaways

Working on this project taught me a few important lessons:
* **APIs are products, not just code**: A contract check ensures you treat your API contract with respect. Catching a breaking change in CI is a lot better than getting a message from a frontend developer saying their app is broken.
* **Resiliency needs to be built-in**: Generative testing forces you to look at input validation seriously. Writing custom validations like `StrictCharField` made the backend much more secure.
* **Automate early**: Having Specmatic run in GitHub Actions gives me peace of mind that any new code doesn't drift from the specification.

---

## Results

After resolving the routing, authentication, and serializer issues, all my tests passed. The GitHub Actions pipeline runs successfully, executing all **545 contract scenarios** with a fully green status and zero warnings.

---

## Conclusion

Taking the concepts from Specmatic Academy and applying them to WorkHive was a great learning experience. It showed me how to move away from manually maintaining API documentation and instead use contracts to drive testing and guard against regressions. Building robust web applications isn't just about writing code that works for the happy paths; it’s about making sure your system fails gracefully and maintains a stable interface as it evolves.
