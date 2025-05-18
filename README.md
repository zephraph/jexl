# Jexl -- JSON Expression Language

A programming language whose syntax is pure JSON. 

## Examples

```json jexl
{
  "name": "fibonacci",
  "lang_version": "v0.1",
  "program": [
    {
      "function": {
        "name": "fib",
        "params": [{"n": "integer"}],
        "body": {
            "if": {
              "condition": { "less": [{ "var": "n" }, 2] },
              "then": [{ "var": "n" }],
              "else": [
                {
                  "add": [
                    {"fib": [{ "subtract": [{ "var": "n" }, 1 ]}]},
                    {"fib": [{"subtract": [{ "var": "n" }, 2 ]}]}
                  ]
                }
              ]
            }
          }
      }
    },
    {"print": [{"fib": [7]}]}
  ]
}
```

```json jexl
{
  "lang_version": "v0.1",
  "program": [
    { 
      "function": {
        "name": "greet",
        "params": [{ "name": "string" }],
        "body": { "print": [{ "concat": ["Hello, ", { "ref": "name" }] }]}
      }
    },
    {"greet": ["Alice"]}
  ]
}
```

