# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e5]:
    - navigation [ref=e6]:
      - generic [ref=e7]:
        - link "RECAPP" [ref=e8] [cursor=pointer]:
          - /url: "#"
        - link [ref=e11] [cursor=pointer]:
          - /url: ""
  - main [ref=e14]:
    - generic [ref=e15]:
      - navigation "breadcrumb" [ref=e18]:
        - list [ref=e19]:
          - listitem [ref=e20]:
            - button "Dashboard" [ref=e21] [cursor=pointer]
          - listitem [ref=e22]: / Test Quiz Playwright
      - button "Show/hide comments" [ref=e25] [cursor=pointer]:
        - img [ref=e26]
        - text: Show/hide comments
      - button "Leave quiz" [ref=e31] [cursor=pointer]:
        - img [ref=e32]
        - generic [ref=e35]: Leave quiz
      - generic [ref=e36]:
        - tablist [ref=e37]:
          - tab "Quiz data" [ref=e38] [cursor=pointer]
          - tab "Quiz questions" [selected] [ref=e39] [cursor=pointer]
        - generic:
          - tabpanel "Quiz questions"
  - contentinfo [ref=e41]:
    - generic [ref=e42]: 1.6.5-OHT-002
```