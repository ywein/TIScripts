TEMPLATES := templates

all: drives/fuel-efficiency-thrust.html unifications/unifications.html

drives/fuel-efficiency-thrust.html: drives/build-chart.js drives/fuel-efficiency-thrust.template.html drives/best-drives.js drives/research-costs.js $(wildcard $(TEMPLATES)/*)
	node drives/build-chart.js $(TEMPLATES)

unifications/unifications.html: unifications/build-unifications.js unifications/unifications.template.html unifications/unifications.js drives/research-costs.js $(wildcard $(TEMPLATES)/*)
	node unifications/build-unifications.js $(TEMPLATES)

test:
	node --test

clean:
	rm -f drives/fuel-efficiency-thrust.html unifications/unifications.html

.PHONY: all test clean
