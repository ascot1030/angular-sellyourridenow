///#source 1 1 /Scripts/generator/app.js
angular.module('generatorApp', [
    'directives.cancelButton',
    'directives.preventDefault',
    'directives.preventIfNoPath',
    'directives.navigation',
    'directives.videoPlayer',
    'directives.dropdownToText',
    'directives.scroller',
    'directives.secureFile',
    'directives.showProgress',
    'directives.toggleSlides',
    'directives.toggleNotes',
    //'directives.facebook',
    'controllers.user',
    'controllers.affiliate',
    'controllers.project',
    'controllers.notepad',
    'controllers.generator',
    'controllers.gettingStarted',
    'controllers.produce',
    'controllers.bonus',
    'controllers.boardroom',
    'controllers.faq',
    'controllers.support',
    'controllers.account',
    'controllers.byVsl',
    'controllers.fastTrack',
    'controllers.faq2',
    //'controllers.forum',
    'controllers.traffic',
    'controllers.pcf',
    'controllers.shortForm',
    'controllers.spf',
    'controllers.notification',
    'controllers.emailFormula',
    'services.project',
    'services.section',
    'services.note',
    'services.slide',
    'services.uuid',
    'services.user',
    'services.account',
    'services.license',
    'services.question',
    'services.answer',
    'services.facebook',
    'services.notification',
    'filters.jsonDate',
    'filters.nl2br',
    'ui.bootstrap',
  	'app.main',
  	'app.navigation',
  	'app.localize',
  	'app.activity',
  	'app.smartui',
    //'app.demoControllers',
    'ngSanitize',
    'ngRoute'
]);

angular.module('generatorApp')
    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider
            .when('/getting-started', { templateUrl: 'partial/getting-started.html' })
            .otherwise({ redirectTo: '/getting-started/toolbox' });

        toastr.options = {
            "debug": false,
            "positionClass": "toast-top-left",
            "fadeIn": 300,
            "fadeOut": 1000,
            "timeOut": 2000,
            "extendedTimeOut": 2000
        };
    }])

    .value('ui.config', {
        tinymce: {
            theme: 'advanced'
        }
    })

    .controller('MainController', [
        '$scope', '$window', '$location', '$filter', '$templateCache', 'ProjectService', 'SectionService', 'NoteService', 'SlideService', 'UuidService', 'UserService', 'NotificationService',
        function MainController($scope, $window, $location, $filter, $templateCache, projectService, sectionService, noteService, slideService, uuidService, userService, notificationService) {
            $scope.title = 'Start Here';

            var renewTime;

            var userId = $scope.userId = userService.userId;
            $scope.user = userService.user;
            $scope.firstName = userService.firstName;
            $scope.requestedPath = '';

            $scope.projects = [];
            $scope.currentProject = {};

            $scope.notes = [];
            $scope.selectedNote = {};

            $scope.slides = [];
            $scope.selectedSlide = {};
            $scope.currentSlide = {};
            $scope.previousSlide = {};
            $scope.navSlide = {};

            $scope.parentSection = {};

            $scope.section = null;

            $scope.projectRequired = true;

            // Some permissions
            $scope.hasBoardroom = userService.hasBoardroom;
            $scope.hasFastTrack = userService.hasFastTrack; // User has if they have  boardroom
            $scope.hasGenerator = userService.hasGenerator;
            $scope.hasVsl = userService.hasVsl; // User has if they have the generator.
            $scope.hasTrafficPros = userService.hasTrafficPros;
            $scope.hasElite = userService.hasElite;
            $scope.hasPcf = userService.hasPcf;
            $scope.has20Min = userService.has20Min;
            $scope.hasScriptGenerator = userService.hasScriptGenerator;
            $scope.hasEmail = userService.hasEmail;

            $scope.progress = false;

            // The scroller can scroll to the right further.
            $scope.scrollMore = false;

            var routeController = '';

            $scope.inStartup = true;

            $scope.hasLoggedIn = false;

            $scope.notifications = notificationService.notifications;


            // If the user isn't logged in and they aren't headed to the login, send to login.
            $scope.$on('$routeChangeStart', function (scope, next, current) {
                if (!userService.loggedIn && (next.controller !== 'LoginController') && (next.controller !== 'ForgotPasswordController')) {
                    // keep the requested path for redirect after successful login.
                    $scope.requestedPath = $location.$$path;

                    $location.path('/login');
                }

                // If user logged in and has no projects and they have permission to create Projects, send to create project page.
                if ($scope.userId && $scope.projectRequired && ($scope.projects.length === 0) && $scope.hasGenerator && !$scope.inStartup) {
                    if (($location.$$path !== '/project/save') &&
                        ($location.$$path !== '/change-password') &&
                        ($location.$$path !== '/account') &&
                        ($location.$$path !== '/login')) {
                        $scope.requestedPath = $location.$$path;

                        $location.path('/project/save');
                    }
                }

                // If the user is logged in and doesn't have permission to create projects and the requested path is /getting-started/toolbox
                // Send to a getting started page
                if ($scope.userId && !$scope.hasGenerator && !$scope.hasVsl && ($location.$$path !== '/getting-started/toolbox')){
                    $location.path('/getting-started');
                }

                // Send data to the server to renew the users login time.
                if (next.controller && userService.loggedIn)
                    $scope.renewLogin();

                routeController = next.controller;
            });

            $scope.$on('$routeChangeSuccess', function (scope, event, current, previous) {
                // Track Google Analytics use of site.
                $window.ga('send', 'pageview', { page: $location.path() });

                pageSetUp();

                if (!$scope.userId && (event.controller !== 'LoginController') && current && (current.controller !== 'LoginController')) {
                    // keep the requested path for redirect after successful login.
                    $scope.requestedPath = $location.$$path;

                    $scope.userId = userId;

                    $location.path('/login');
                }

            });

            // Project Section
            $scope.selectProject = function (idx) {
                projectService.setProject($scope.projects[idx]);
            };

            $scope.refreshProjects = function () {
                getProjects();
            };

            // Get a list of projects for the user, if they are logged in and have permission.
            var getProjects = function () {
                if (userService.loggedIn && userService.user && userService.user.accountId && ($scope.hasGenerator || $scope.hasScriptGenerator))
                    projectService.getProjects(userService.user.accountId);
            };

            $scope.$on('projectChanged', function () {
                $scope.progress = false;

                $scope.currentProject = projectService.currentProject;

                if ($scope.currentProject.title) {
                    toastr.info("Project Changed to " + $scope.currentProject.title);

                    slideService.clearIndividualSlide();

                    $scope.getNotes();
                    $scope.getSlides();
                }
            });

            $scope.$on('projectsReceived', function () {
                $scope.projects = projectService.projects;
                $scope.currentProject = projectService.currentProject;

                if ($scope.projects.length > 0) {
                    $scope.currentProject = projectService.currentProject;

                    $scope.getNotes();
                    $scope.getSlides();

                    getUserNotifications();
                }

                if (projectService.projects.length > 0)
                    toastr.success('Projects Loaded.');

                $scope.$broadcast('projectsReceivedChildren');

                $scope.projectRequired = (projectService.projects.length === 0);

                $scope.inStartup = false;

                // If user logged in and has no projects and they have permission to create Projects, send to create project page.
                if ($scope.userId && $scope.projectRequired && ($scope.projects.length === 0) && $scope.hasGenerator) {
                    if (($location.$$path !== '/project/save') &&
                        ($location.$$path !== '/change-password') &&
                        ($location.$$path !== '/account') &&
                        ($location.$$path !== '/login')) {
                        $scope.requestedPath = $location.$$path;

                        $location.path('/project/save');
                    }
                }
            });

            $scope.deleteProject = function () {
                if ($window.confirm('This will delete the current VSL selected, "' + $scope.currentProject.title + '". This process cannot be undone. Do you wish to proceed? ')) {
                    projectService.deleteProject($scope.currentProject);
                }
            };

            $scope.$on('projectDeleted', function () {
                toastr.success("Project Deleted");

                getProjects();
            });

            $scope.$on('userRetrieved', function () {
                $scope.progress = false;

                $scope.user = userService.user;

                userId = $scope.userId = userService.userId;
                $scope.firstName = userService.firstName;

                // redirect to requested page.
                var redirect = userService.redirect;
                userService.redirect = null;

                // Set permissions
                $scope.setPermissions();

                $location.path(redirect);

                getProjects();
                getUserNotifications();
            });

            $scope.$on('userDataFailed', function () {
                $window.alert(userService.error.data.responseStatus.message);
            });

            $scope.$on('loggedInFailed', function () {
                $scope.progress = false;
                $window.alert('Login Failed: Invalid email and/or password');
            });

            $scope.$on('loggedOut', function () {
                // Reset scope vars
                projectService.projects = [];
                projectService.currentProject = {};
                localStorage.removeItem('currentProject');
                slideService.slides = [];
                noteService.notes = [];

                $scope.user = userService.user;

                userId = $scope.userId = null;
                $scope.firstName = null;
                $scope.projects = [];
                $scope.slides = [];
                $scope.notes = [];

                $scope.resetSlides();
                $scope.resetNotes();

                $scope.requestedPath = userService.returnPath;

                $scope.setPermissions();

                $location.path('/login');
            });

            // Notes Section
            // Get a list of notes for the user.
            $scope.getNotes = function () {
                noteService.getNotes($scope.currentProject.id);
            };

            $scope.deleteNote = function (note) {
                if ($window.confirm("Are you sure that you want to delete this note?")) {
                    noteService.deleteNote(note);
                }
            };

            $scope.$on('notesRetrieved', function () {
                $scope.notes = noteService.notes;
                $scope.currentNote = noteService.currentNote;

                $scope.resetNotes();
            });

            $scope.$on('noteDeleted', function () {
                $scope.notes = noteService.notes;
                $scope.currentNote = noteService.currentNote;

                $scope.resetNotes();
            });

            $scope.$on('noteSaved', function () {
                $scope.progress = false;

                $scope.selectNote(null);

                $scope.getNotes();
            });

            $scope.$on('noteSavedError', function () {
                $scope.progress = false;
            });

            var getNotesByCategory = function (category, notes) {
                return notes.filter(function (elem, index, array) {
                    return elem.noteCategory === category;
                });
            };

            $scope.resetNotes = function () {
                $scope.uspNotes = getNotesByCategory("USP Factory", $scope.notes);
                $scope.storiesNotes = getNotesByCategory("2 Stories", $scope.notes);
                $scope.tipsNotes = getNotesByCategory("3 Tips", $scope.notes);
                $scope.generalNotes = getNotesByCategory("General", $scope.notes);
            };

            // Slide Section
            $scope.getSlides = function () {
                $scope.progress = true;

                slideService.getSlides($scope.currentProject.id);
            };

            $scope.deleteSlide = function (slide) {
                if ($window.confirm("Are you sure that you want to delete this slide?")) {
                    slideService.deleteSlide(slide);
                }
            };

            $scope.$on('slidesRetrieved', function () {
                $scope.progress = false;

                $scope.slides = slideService.slides;
                $scope.currentSlide = slideService.currentSlide;

                $scope.resetSlides();
            });

            $scope.$on('slideDeleted', function () {
                $scope.progress = false;

                $scope.slides = slideService.slides;
                $scope.currentSlide = slideService.currentSlide;

                $scope.resetSlides();
            });

            $scope.$on('slideSaved', function () {
                $scope.progress = false;

                $scope.resetSlides();

                redirectSlideEdit();
            });

            $scope.$on('slideSavedError', function () {
                $scope.progress = false;
            });

            $scope.$on('redirectSlide', function () {








                redirectSlideEdit();
            });

            var redirectSlideEdit = function () {
                // Remove to disable auto-save
                //// If there is a slide to edit, there will be a redirect
                //// value. So send the user to it.
                //if (slideService.redirect != '')
                //    $location.path(slideService.redirect);

                // Auto Save not enabled, use this instead
                $location.path(slideService.currentSlide.editUrl);
            };

            $scope.$on('slideChanged', function () {
                angular.copy(slideService.editSlide, $scope.currentSlid);
            });

            var getSlidesBySection = function (section, slides) {
                return slides.filter(function (elem, index, array) {
                    return elem.section === section;
                });
            };

            $scope.resetSlides = function () {
                $scope.piSlides = slideService.getSlidesBySection("Part 1:1 Pattern Interrupt");
                $scope.wnSlides = slideService.getSlidesBySection("Part 2:1 Watch This Now");
                $scope.bfSlides = slideService.getSlidesBySection("Part 2:2 Benefit Formula");
                $scope.vsSlides = slideService.getSlidesBySection("Part 3:1 Video Scarcity");
                $scope.sdSlides = slideService.getSlidesBySection("Part 4:1 Something Completely Different");
                $scope.dealSlides = slideService.getSlidesBySection("Part 5:1 Let's Make A Deal");

                $scope.miSlides = slideService.getSlidesBySection("Part 1:1 A Modest Introduction");
                $scope.nmIntroSlides = slideService.getSlidesBySection("Part 2:2 The Intro");
                $scope.nmBpSlides = slideService.getSlidesBySection("Part 2:3 The Bad Part");
                $scope.nmRbpSlides = slideService.getSlidesBySection("Part 2:4 The Really Bad Part");
                $scope.nmDiSlides = slideService.getSlidesBySection("Part 2:5 The Declaration Of Independence");
                $scope.nmMjSlides = slideService.getSlidesBySection("Part 2:6 The Moral Journey To Freedom");
                $scope.bpTansitionSlides = slideService.getSlidesBySection("Part 3:1 Transition To Big Problem");
                $scope.aboutSystemSlides = slideService.getSlidesBySection("Part 4:1 About The System");
                $scope.systemResultsSlides = slideService.getSlidesBySection("Part 5:1 Results Of The System");
                $scope.finalTransitionSlides = slideService.getSlidesBySection("Part 6:1 Final Transition Phrase");

                $scope.bigLieTransitionSlides = slideService.getSlidesBySection("Part 1:2 The Big Lie Transition");
                $scope.bigLieLoopSlides = slideService.getSlidesBySection("Part 1:3 The Big Lie (Lie Loop)");
                $scope.noFaultSlides = slideService.getSlidesBySection("Part 1:4 It's Not Your Fault");
                $scope.blameThisSlides = slideService.getSlidesBySection("Part 1:5 Blame This");
                $scope.bigTruthSlides = slideService.getSlidesBySection("Part 1:6 The Big Truth");
                $scope.openBigSolutionLoopSlides = slideService.getSlidesBySection("Part 2 Bigger Solution Open Loop");

                $scope.openTipLoopSlides = slideService.getSlidesBySection("Part 1 Open Tip Loop");
                $scope.threeTipFormulaSlides = slideService.getSlidesBySection("Part 2 The 3 Tip Formula");
                $scope.avoidTipSlides = slideService.getSlidesBySection("Part 3 The Avoid Tip");
                $scope.enjoyTipSlides = slideService.getSlidesBySection("Part 4 The Enjoy Tip");
                $scope.howToTipSlides = slideService.getSlidesBySection("Part 5 The How To Tip");
                $scope.grandOfferTransitionSlides = slideService.getSlidesBySection("Part 6 Transition To Grand Offer");

                $scope.formalIntroSlides = slideService.getSlidesBySection("Part 1:1 Overview + Formal Intro");
                $scope.uspSlides = slideService.getSlidesBySection("Part 1:2 Product + USP");
                $scope.worksSlides = slideService.getSlidesBySection("Part 1:3 Works Even If");
                $scope.whatIsntSlides = slideService.getSlidesBySection("Part 1:4 What It Isn't");
                $scope.heroStudySlides = slideService.getSlidesBySection("Part 1:5 The Hero Study");
                $scope.heroStudyResultSlides = slideService.getSlidesBySection("Part 1:6 Results Of Hero Study");
                $scope.outOfClubSlides = slideService.getSlidesBySection("Part 1:7 Out Of The Club");
                $scope.easyAsSlides = slideService.getSlidesBySection("Part 1:8 Easy As It Gets");
                $scope.QualifyRemainingSlides = slideService.getSlidesBySection("Part 1:9 Qualify Remaining");
                $scope.testimonialsSlides = slideService.getSlidesBySection("Part 1:10 Testimonials");
                $scope.whatsInItSlides = slideService.getSlidesBySection("Part 1:11 What's In The Product");
                $scope.emphasizeSlides = slideService.getSlidesBySection("Part 1:12 Emphasize X");
                $scope.firstPriceTeaseSlides = slideService.getSlidesBySection("Part 1:13 First Price Tease");
                $scope.moreBenefitsSlides = slideService.getSlidesBySection("Part 1:14 3 More Benefits");

                $scope.fauxPriceSlides = slideService.getSlidesBySection("Part 2:1 Emphasize The Faux Price");
                $scope.bonusSlides = slideService.getSlidesBySection("Part 2:2 Bonuses");
                $scope.restateFauxPriceSlides = slideService.getSlidesBySection("Part 2:3 Restate Faux Price");
                $scope.costOfLossSlides = slideService.getSlidesBySection("Part 2:4 Cost Of Loss");
                $scope.discountReasonSlides = slideService.getSlidesBySection("Part 2:5 Reason For Discount");
                $scope.priceDropdownSlides = slideService.getSlidesBySection("Part 2:6 Price Dropdown");
                $scope.priceRevealSlides = slideService.getSlidesBySection("Part 2:7 Price Reveal");
                $scope.tripleGuaranteeSlides = slideService.getSlidesBySection("Part 2:8 3X Triple Guarantee");

                $scope.ctaOverviewSlides = slideService.getSlidesBySection("Part 3:1 Overview + 3X CTA");
                $scope.ctaTestimonialsSlides = slideService.getSlidesBySection("Part 3:2 Testimonials");
                $scope.superBonusSlides = slideService.getSlidesBySection("Part 3:3 The Super Bonus");
                $scope.inclusionSlides = slideService.getSlidesBySection("Part 3:4 Inclusion");
                $scope.ctaSlides = slideService.getSlidesBySection("Part 3:5 3X CTA");
                $scope.checkoutSlides = slideService.getSlidesBySection("Part 3:6 Checkout Process");

                $scope.reminderSlides = slideService.getSlidesBySection("Part 4:1 Reminder");
                $scope.responsibilitySlides = slideService.getSlidesBySection("Part 4:2 Responsibility");
                $scope.reinforceSlides = slideService.getSlidesBySection("Part 4:3 Reinforce");

                $scope.futureActionsSlides = slideService.getSlidesBySection("Part 5:1 Future Paced Actions");
                $scope.rememberOverviewSlides = slideService.getSlidesBySection("Part 5:2 Remember Overview");
                $scope.actNowSlides = slideService.getSlidesBySection("Part 5:3 3 Reasons To Act Now");
                $scope.smartThingSlides = slideService.getSlidesBySection("Part 5:4 The Smart Thing");

                $scope.qaSlides = slideService.getSlidesBySection("Part 6 Q&A Tips");

                $scope.$broadcast('slidesReset');
            };

            $scope.navToSlide = function (slide) {
                $scope.resetSlides();
                slideService.routeSlide(slide);
            };

            $scope.nlToBr = function (content) {
                return content.replace(/\n/g, '<br />');
            };

            $scope.slideClear = function () {
                //slideService.setSlide({});
            };

            var getUuid = function () {
                uuidService.getUuid();
            };

            var deleteUuid = function () {
                uuidService.deleteUuid();
            };

            $scope.$on('uuidRetrieved', function () {
                $scope.uuid = uuidService.uuid;

                userService.uuid = $scope.uuid;
            });

            $scope.$on('uuidDeleted', function () {
                $scope.uuid = null;
            });

            $scope.logout = function () {
                userService.logout({ userId: userId, device: $scope.uuid }, $location.$$path);
            };

            $scope.renewLogin = function () {
                if (userService.user)
                    userService.renewLogin(userService.user);
            };


            $scope.$on('authenticatedTrue', function () {
                $scope.setPermissions();

                if (projectService.projects.length === 0)
                    getProjects();
            });

            // If the user isn't authenticated, send to login and show message.
            $scope.$on('authenticatedFalse', function () {
                if (userService.loggedIn)
                    $window.alert("You have been logged out due to inactivity or changes in the generator. Please refresh the site and login.");

                // Set the current location as the place to return to after login.
                userService.redirect = $location.$$path;
            });

            $scope.openDialog = function () {
                var options = {
                    backdrop: false,
                    keyboard: true,
                    templateUrl: '/partial/notepad/modal-note.html',
                    controller: 'ModelNoteController',
                    resolve: {
                        title: function () {
                            return angular.copy($scope.title);
                        },
                        note: function () {
                            return {
                                noteCategory: "General",
                                projectId: projectService.currentProject.id,
                                userNote: $scope.title + " - "
                            };
                        }
                    }
                };

                //var d = $dialog.dialog(options);
                //d.open().then(function (result) {
                //    if (result) {
                //        alert('dialog closed with result: ' + result);
                //    }
                //});
            };

            $scope.editNote = function (note) {
                var options = {
                    backdrop: false,
                    keyboard: true,
                    templateUrl: '/partial/notepad/modal-note.html',
                    controller: 'ModelNoteController',
                    resolve: {
                        title: function () {
                            return angular.copy($scope.title);
                        },
                        note: function () {
                            return note;
                        }
                    }
                };

                //var d = $dialog.dialog(options);
                //d.open().then(function (result) {
                //    if (result) {
                //        alert('dialog closed with result: ' + result);
                //    }
                //});
            };

            $scope.startVslCopy = function () {
                if ($window.confirm('This will create a copy the current VSL selected, "' + $scope.currentProject.title + '". Do you wish to proceed?'))
                    $location.path('/copy-project/' + $scope.currentProject.id);
            };

            //getProjects();
            getUuid();

            $scope.moveSlideUp = function (slide) {
                $scope.progress = true;

                slide.slideOrder--;

                slideService.reorderSlides(slide);
            };

            $scope.moveSlideDown = function (slide) {
                $scope.progress = true;

                slide.slideOrder++;

                slideService.reorderSlides(slide);
            };

            $scope.setPermissions = function () {
                $scope.hasGenerator = userService.hasGenerator;
                $scope.hasVsl = userService.hasVsl;
                $scope.hasBoardroom = userService.hasBoardroom;
                $scope.hasFastTrack = userService.hasFastTrack;
                $scope.hasTrafficPros = userService.hasTrafficPros;
                $scope.hasElite = userService.hasElite;
                $scope.hasPcf = userService.hasPcf;
                $scope.has20Min = userService.has20Min;
                $scope.hasScriptGenerator = userService.hasScriptGenerator;
                $scope.hasSpf = userService.hasSpf;
                $scope.hasEmail = userService.hasEmail;
            };



            $scope.$on('userNotificationsRetrieved', function () {
                $scope.progress = false;

                $scope.notifications = notificationService.notifications;
            });

            $scope.$on('userNotificationsRetrievedFailed', function () {
                $scope.progress = false;

                toastr.error('Failed to Get Notifications.');
            });

            $scope.getUserNotifications = function () {
                $scope.progress = true;

                notificationService.getUserNotifications($scope.user);
            };

            var getUserNotifications = function () {
                $scope.getUserNotifications();
            };

            setInterval(getUserNotifications, 900000);

            $scope.deleteNotification = function (notification) {
                notificationService.deleteNotification($scope.user, notification);
            };

            $scope.$on('notificationDeleted', function () {
                $scope.progress = false;

                $scope.getUserNotifications();
            });

            $scope.$on('notificationDeletedFailed', function () {
                $scope.progress = false;

                toastr.error('Failed to Delete Notification.');
            });

            //var init = function () {
            //    userService.setPermissions();
            //};

            // Remove Template cache on first load.
            $templateCache.removeAll();

            // Only call first time site loaded.
            //userService.renewLogin();

            //userService.setPermissions();

            $('#noteModal').dialog({
                autoOpen: false,
                width: 600,
                resizable: false,
                modal: true,
                title: "<div class='widget-header'><h4><i class='fa fa-warning'></i> Empty the recycle bin?</h4></div>",
                buttons: [{
                    html: "<i class='fa fa-trash-o'></i>&nbsp; Delete all items",
                    "class": "btn btn-danger",
                    click: function () {
                        $(this).dialog("close");
                    }
                }, {
                    html: "<i class='fa fa-times'></i>&nbsp; Cancel",
                    "class": "btn btn-default",
                    click: function () {
                        $(this).dialog("close");
                    }
                }]
            });

            $scope.selectNote = function (note) {
                if (!note) {
                    note = {
                        noteCategory: "General",
                        projectId: projectService.currentProject.id,
                        userNote: $scope.title + " - "
                    };
                }

                note.userNote = note.userNote.replace(/<br \/>/g, "\n");

                noteService.setNote(note);
                $scope.currentNote = note;

                //$('#noteModal').dialog('open');
            };

            $scope.saveNote = function () {
                $scope.progress = true;

                noteService.saveNote($scope.currentNote);
            };

            // Get Projects if there are none. Called on first load or page refresh.
            if (projectService.projects.length === 0) {
                getProjects();
            }

            //init();

        }]);
///#source 1 1 /Scripts/generator/services/video.js
angular.module('services.video', ['ngResource'])
    .factory('VideoService', ['$resource', function ($resource) {
        'use strict';

        return $resource('api/video', {}, {
            query: { method: 'GET', isArray: true }
        });
    }]);
///#source 1 1 /Scripts/generator/services/uuid.js
angular.module('services.uuid', ['ngResource'])
    .factory('UuidService', ['$rootScope', '$resource', function ($rootScope, $resource) {
        'use strict';

        var service = {};

        service.uuid = localStorage.getItem("uuid");

        service.getUuid = function (projectId) {
            var self = this;

            if (localStorage.getItem("uuid") == null) {
                var success = function (response) {
                    // Make changes to mainApp.
                    self.uuid = response.id;
                    localStorage.setItem("uuid", response.id);

                    $rootScope.$broadcast('uuidRetrieved');
                };

                var failure = function (xhr) {
                    toastr.error('Failed to Get UUID.');
                };

                self.resource.get({}, success, failure);
            } else {
                $rootScope.$broadcast('uuidRetrieved');
            }
        };

        service.deleteUuid = function (slide) {
            var self = this;

            localStorage.removeItem("uuid");

            $rootScope.$broadcast('uuidDeleted');
        };

        service.resource = $resource('api/v1/uuid', {}, {
            query: { method: 'GET', isArray: true }
        });

        return service;
    }]);
///#source 1 1 /Scripts/generator/services/user.js
angular.module('services.user', ['ngResource'])
    .factory('UserService', ['$rootScope', '$resource', '$window', '$location', function ($rootScope, $resource, $window, $location) {
        'use strict';

        // Local storage items are changed in case the user closes
        // or refreshes their browser, we remember part of their history.
        // This is in multiple places. But the items have to be set directly
        // when an action occurs the values pulled from localStorage are called
        // only the first time this module is loaded, since Angular services
        // are setup as singletons.

        var service = {};

        service.resource = $resource('api/v1/member/:action/:id', {}, {
            query: { method: 'GET', isArray: true },
            isAuthenticated: { method: 'GET', params: { action: 'is-authenticated' } },
            removeDevice: { method: 'POST', params: { action: 'remove-device' } },
            changePassword: { method: 'POST', params: { action: 'change-password' } },
            forgotPassword: { method: 'POST', params: { action: 'forgot-password' } }
        });

        service.authenticateResource = $resource('api/v1/member/is-authenticated', {}, {
            query: { method: 'GET', isArray: true }
        });

        service.loginResource = $resource('api/v1/:action', {}, {
            query: { method: 'GET', isArray: true },
            login: { method: 'POST', params: { action: 'login' } },
            logout: { method: 'GET', params: { action: 'logout' } }
        });

        service.user = JSON.parse(localStorage.getItem("user"));
        service.firstName = localStorage.getItem("firstName");
        service.userId = localStorage.getItem("userId");
        service.uuid = localStorage.getItem("uuid");
        service.loggedIn = localStorage.getItem("loggedIn");

        service.redirect = null;
        service.error = {};
        service.returnPath = '';
        service.status = '';
        service.error = {};

        service.hasBoardroom = false;
        service.hasFastTrack = false;
        service.hasGenerator = false;
        service.hasVsl = false; // User has if they have the generator.
        service.hasTrafficPros = false;
        service.hasElite = false;
        service.hasPcf = false;
        service.has20Min = false;
        service.hasScriptGenerator = false;
        service.hasSpf = false;
        service.hasEmail = false;

        service.login = function (data, redirect) {
            var self = this;

            var success = function (response) {
                // Login succeeded, so get userData.
                self.getUserData(response);
            };

            var failure = function (xhr) {
                self.status = xhr.status;
                $rootScope.$broadcast('loggedInFailed');
            };

            service.redirect = redirect;

            self.loginResource.login(data.user, success, failure);
        };

        service.getUserData = function (loginData) {
            var self = this;

            var success = function (response) {
                localStorage.setItem('user', JSON.stringify(response));
                localStorage.setItem('firstName', response.firstName);
                localStorage.setItem('userId', response.id);
                localStorage.setItem('loggedIn', true);

                self.firstName = response.firstName;
                self.userId = response.id;
                self.user = response;
                self.loggedIn = true;

                self.setPermissions();

                //$rootScope.$broadcast('loggedIn');
                $rootScope.$broadcast('userRetrieved');
            };

            var failure = function (xhr) {
                self.error = xhr;
                $rootScope.$broadcast('userDataFailed');
            };

            self.resource.get({ uuid: loginData.uuid, sessionId: loginData.sessionId }, success, failure);
        };

        service.logout = function (data, returnPath) {
            var self = this;
            var userId = data.userId;

            var success = function (response) {
                // Save the login info so that the user doesn't have to login
                // login again from the current device/browser.
                localStorage.removeItem('firstName');
                localStorage.removeItem('userId');
                localStorage.removeItem('user');
                localStorage.removeItem('loggedIn');

                self.firstName = null;
                self.userId = null;
                self.user = null;
                self.loggedIn = false;

                // TODO: Remove the Device from the login.
                self.removeDevice(userId);

                self.setPermissions();

                $rootScope.$broadcast('loggedOut');
            };

            var failure = function (xhr) {
                // Save the login info so that the user doesn't have to login
                // login again from the current device/browser.
                localStorage.removeItem('firstName');
                localStorage.removeItem('userId');
                localStorage.removeItem('user');
                localStorage.removeItem('loggedIn');

                self.firstName = null;
                self.userId = null;
                self.user = null;
                self.loggedIn = false;

                self.setPermissions();

                $rootScope.$broadcast('loggedOut');
            };

            self.returnPath = returnPath;
            
            // Only log out if not logged in.
            // This prevents multiple logout attempts if 
            // Angular redirects pose a problem.
            if (self.loggedIn)
                self.loginResource.logout(data, success, failure);
        };

        service.removeDevice = function (userId) {
            var self = this;

            var success = function (data) {
                $rootScope.$broadcast('deviceRemoved');
            };

            var failure = function (xhr) {
                $rootScope.$broadcast('deviceNotRemoved');
            };

            self.resource.removeDevice({ id: userId, uuid: self.uuid }, success, failure);
        };

        service.renewLogin = function (user) {
            var self = this;

            var success = function (response) {
                // Send message of Users login status
                if (response.isAuthenticated) {
                    localStorage.setItem('loggedIn', true);
                    self.loggedIn = true;

                    $rootScope.$broadcast('authenticatedTrue');
                } else {
                    self.logout({ userId: self.userId, device: self.uuid }, $location.$$path);
                    $rootScope.$broadcast('authenticatedFalse');
                }
            };

            var failure = function (xhr) {
                self.logout({ userId: self.userId, device: self.uuid }, $location.$$path);
                $rootScope.$broadcast('renewLoginFailed');
            };

            self.authenticateResource.get({ id: user.id }, success, failure);
        };

        service.changePassword = function (data) {
            var self = this;

            var success = function (response) {
                $rootScope.$broadcast('passwordChanged');
            };

            var failure = function (xhr) {
                self.error = xhr.data.responseStatus;
                $rootScope.$broadcast('passwordChangeFailed');
            };

            self.resource.changePassword(data, success, failure);
        };

        service.forgotPassword = function (data) {
            var self = this;

            var success = function (response) {
                $rootScope.$broadcast('passwordForgottenProcessed');
            };

            var failure = function (xhr) {
                self.error = xhr.data.responseStatus;
                $rootScope.$broadcast('passwordForgottenFailed');
            };

            self.resource.forgotPassword(data, success, failure);
        };

        service.checkGenerator = function () {
            var self = this;

            self.hasGenerator = (self.hasPermission('3x generator').length > 0)
                || (self.hasPermission('3x generator gift').length > 0);
        };

        service.checkVsl = function () {
            var self = this;
            
            // If user has generator persmissions, then they have VSL permissions.
            self.hasVsl = self.hasGenerator
                || (self.hasPermission('3x vsl').length > 0)
                || (self.hasPermission('3x vsl gift').length > 0);
        };

        service.checkBoardroom = function () {
            var self = this;

            self.hasBoardroom = (self.hasPermission('boardroom').length > 0)
                || (self.hasPermission('boardroom gift').length > 0);
        };

        service.checkFastTrack = function () {
            var self = this;

            var permission = self.hasPermission('3x vsl fast track');
            self.hasFastTrack = self.hasBoardroom || (permission.length > 0);
        };

        service.checkTrafficPro = function () {
            var self = this;

            self.hasTrafficPros = (self.hasPermission('3x traffic').length > 0)
                || (self.hasPermission('3x traffic pros').length > 0)
                || (self.hasPermission('3x traffic pros gift').length > 0)
                || (self.hasPermission('3x digital traffic pros').length > 0)
                || (self.hasPermission('3x digital traffic pros gift').length > 0);
        };

        service.checkPcf = function () {
            var self = this;

            self.hasPcf = (self.hasPermission('28 pcf').length > 0)
                || (self.hasPermission('28 pcf gift').length > 0)
                || (self.hasPermission('3x generator').length > 0)
                || (self.hasPermission('3x generator gift').length > 0);
        };

        service.check20Min = function () {
            var self = this;

            self.has20Min = (self.hasPermission('20-minute vsl').length > 0);
        };

        service.checkScriptGenerator = function () {
            var self = this;

            self.hasScriptGenerator = (self.hasPermission('3x sales script').length > 0);
        };

        service.checkSpf = function () {
            var self = this;

            self.hasSpf = (self.hasPermission('Sales Letter Formula').length > 0);
        };

        service.checkEmail = function () {
            var self = this;

            self.hasEmail = (self.hasPermission('Email Formula').length > 0)
                || (self.hasPermission('3x generator').length > 0)
                || (self.hasPermission('3x generator gift').length > 0);
        };

        // Check if the user has the permission requested
        service.hasPermission = function (permission) {
            var self = this;

            if (self.user && self.user.permissions) {
                return self.user.permissions.filter(function (elem, index, array) {
                    return elem === permission;
                });
            } else {
                return [];
            }
        };

        service.setPermissions = function () {
            var self = this;
            
            self.checkGenerator();
            self.checkVsl();
            self.checkBoardroom();
            self.checkFastTrack();
            self.checkTrafficPro();
            self.checkPcf();
            self.check20Min();
            self.checkScriptGenerator();
            self.checkSpf();
            self.checkEmail();
        };

        var init = function () {
            service.setPermissions();
        };

        init();

        return service;
    }]);
///#source 1 1 /Scripts/generator/services/slide.js
angular.module('services.slide', ['ngResource'])
    .factory('SlideService', ['$rootScope', '$resource', function ($rootScope, $resource) {
        'use strict';

        var service = {};

        service.slides = [];
        service.previousSlide = {};
        service.currentSlide = {};
        service.editSlide = {};
        service.preEdit = {};
        service.redirect = '';

        // Save the slide on nav change. Set to true initially
        service.saveOnNav = true;
        service.editNav = false;



        
        //service.navSlide = {};


        service.getSlides = function (projectId) {
            var self = this;

            var success = function (response) {
                // Make changes to mainApp.
                self.slides = response;

                $rootScope.$broadcast('slidesRetrieved');
            };

            var failure = function (xhr) {
                toastr.error('Failed to Get Slides.');
            };

            self.resource.query({ projectId: projectId }, success, failure);
        };

        service.saveSlide = function () {
            var self = this;
            var slideId = self.currentSlide.id;

            var success = function (response) {
                // Set the previous slide, this is used to determine the next slide in order.
                self.previousSlide = response;

                // Removed to disable auto save
                //// If there is an edit slide, let's make that the new current
                //// slide, otherwise make current an empty slide.
                //if (self.editSlide.content && (self.editSlide.content != '')) {
                //    angular.copy(self.editSlide, self.currentSlide);

                //    // Reset the edit slide, since we just made it the current slide.
                //    self.editSlide = {};

                //    // Set a redirect that listeners can handle
                //    self.redirect = self.currentSlide.editUrl;
                //} else {
                //    self.currentSlide = {};

                //    // No redirect for an empty slide, this only happens
                //    // if there is an edit.
                //    self.redirect = '';
                //}

                self.currentSlide = {};
                self.preEdit = {};
                self.editSlide = {};

                // If the slide has no id, it is new, so add to list of slides.
                if (!slideId) {
                    self.slides.push(response);
                }

                $rootScope.$broadcast('slideSaved');


            };

            var failure = function () {
                toastr.error('Problem saving slide. Make sure you have created a VSL Project by clicking "New VSL" below.');

                $rootScope.$broadcast('slideSavedError');
            };

            // Only save if there is content to save.
            if (self.currentSlide.content && (self.currentSlide.content != ''))
                self.resource.save(self.currentSlide, success, failure);
        }

        // This comes in to setup the service to edit a slide.
        service.routeSlide = function (slide) {
            var self = this;

            // Removing to disable auto save functionality.
            //angular.copy(slide, self.editSlide);

            //// First save the existing slide if there is one.
            //if (self.currentSlide.content && (self.currentSlide.content != '')) {
            //    // Generator controller will use this to not save when an edit is
            //    // occuring. It wants to save when it leaves for auto save.
            //    self.saveOnNav = false;

            //    self.saveSlide();
            //} else {
            //    // Generator controller will use this to not save when an edit is
            //    // occuring. It wants to save when it leaves for auto save.
            //    self.saveOnNav = false;

            //    angular.copy(slide, self.currentSlide);
            //    self.redirect = self.currentSlide.editUrl;

            //    self.editSlide = {};
            //    // Broadcast to redirect for edit.
            //    $rootScope.$broadcast('redirectSlide');
            //}

            self.currentSlide.content = self.preEdit.content;

            self.editNav = true;
            self.currentSlide = slide;
            self.editSlide = self.currentSlide;
            self.currentSlide.content = service.brToNl(self.currentSlide.content);
            $rootScope.$broadcast('redirectSlide');
        };

        service.setSlide = function (slide) {
            //this.editSlide = slide;
            this.currentSlide = slide;

            //localStorage.setItem('currentSlide', JSON.stringify(slide));

            $rootScope.$broadcast('slideChanged');
        };

        service.deleteSlide = function (slide) {
            var self = this;

            var success = function (response) {
                toastr.success('Slide deleted');

                self.getSlides(response.projectId);
            };

            var failure = function () {
                toastr.error('Problem deleting slide');
            };

            self.resource.remove({ id: slide.id }, success, failure);
        };



        service.getSlidesBySection = function (section) {
            return this.slides.filter(function (elem, index, array) {
                return elem.section == section;
            });
        };

        service.clearIndividualSlide = function () {
            this.previousSlide = {};
            this.currentSlide = {};
            this.editSlide = {};
            this.preEdit = {};
        };

        service.brToNl = function (content) {
            return content.replace(/<br\s*\/?>/mg, "\n");
        };

        service.reorderSlides = function (slide) {
            var self = this; 

            var success = function (response) {
                self.getSlides(response.projectId);
            };

            var failure = function () {
                toastr.error('Problem saving slide');

                $rootScope.$broadcast('slideSavedError');
            };

            self.reorderResource.save(slide, success, failure);

            console.log(slide);
        };

        service.reorderResource = $resource('api/v1/slides/reorder', {}, {
            query: { method: 'GET', isArray: true }
        });

        service.resource = $resource('api/v1/slides/:slideId', {}, {
            query: { method: 'GET', isArray: true }
        });

        return service;
    }]);
///#source 1 1 /Scripts/generator/services/section.js
angular.module('services.section', ['ngResource'])
    .factory('SectionService', ['$rootScope', '$resource', function ($rootScope, $resource) {
        'use strict';

        var service = {};

        service.selectedSection = {};

        service.setCurrentSection = function (section) {
            this.selectedSection = section;

            localStorage.setItem('currentSection', JSON.stringify(section));

            $rootScope.$broadcast('changeSection');
        };

        service.getCurrentSection = function () {
            return JSON.parse(localStorage.getItem("currentSection") || this.selectedSection);
        }

        service.resource = $resource('api/sections/:sectionId', {}, {
            query: { method: 'GET', isArray: true }
        });

        return service;
    }]);
///#source 1 1 /Scripts/generator/services/question.js
angular.module('services.question', ['ngResource'])
    .factory('QuestionService', ['$rootScope', '$resource', function ($rootScope, $resource) {
        'use strict';

        var service = {};

        service.questions = [];
        service.currentQuestion = {};
        service.totalQuestions = 0;
        service.errorMessage = '';

        service.getQuestions = function (request) {
            var self = this;

            var success = function (response) {
                // Make changes to mainApp.
                //self.questions = response.results;
                self.totalQuestions = response.totalQuestions;

                // push onto the existing questions for infinite add more on single page.
                angular.forEach(response.results, function (value, key) {
                    self.questions.push(value);
                });

                $rootScope.$broadcast('questionsReceived');
            };

            var failure = function (xhr) {
                $rootScope.$broadcast('questionsFailed');
            };

            self.resource.get(request, success, failure);
        };

        service.getQuestion = function (data) {
            var self = this;

            var success = function (response) {
                // Make changes to mainApp.
                self.currentQuestion = response;


                $rootScope.$broadcast('questionReceived');
            };

            var failure = function (xhr) {
                $rootScope.$broadcast('questionFailed');
            };

            self.resource.get({ id: data }, success, failure);
        };

        service.saveQuestion = function () {
            var self = this;

            var success = function (response) {
                // Make changes to mainApp.
                self.currentQuestion = response;


                $rootScope.$broadcast('questionSaved');
            };

            var failure = function (xhr) {
                $rootScope.$broadcast('questionSaveFailed');
            };

            self.resource.save(self.currentQuestion, success, failure);
        };

        service.upVote = function () {
            var self = this;

            var success = function (response) {
                // Make changes to mainApp.
                self.currentQuestion.question = response;


                $rootScope.$broadcast('questionUpVoteSaved');
            };

            var failure = function (xhr) {
                self.errorMessage = xhr.data.responseStatus.message;
                $rootScope.$broadcast('questionUpVoteFailed');
            };

            self.resource.upVote(self.currentQuestion.question, success, failure);
        };

        service.downVote = function () {
            var self = this;

            var success = function (response) {
                // Make changes to mainApp.
                self.currentQuestion.question = response;


                $rootScope.$broadcast('questionDownVoteSaved');
            };

            var failure = function (xhr) {
                self.errorMessage = xhr.data.responseStatus.message;
                $rootScope.$broadcast('questionUpVoteFailed');
            };

            self.resource.downVote(self.currentQuestion.question, success, failure);
        };

        service.resource = $resource('api/questions/:id/:action', {id:'@id'}, {
            query: { method: 'GET', isArray: true },
            upVote: { method: 'POST', params: { action: 'upvote' } },
            downVote: { method: 'POST', params: { action: 'downvote' } }
        });

        return service;
    }]);
///#source 1 1 /Scripts/generator/services/project.js
angular.module('services.project', ['ngResource'])
    .factory('ProjectService', ['$rootScope', '$resource', function ($rootScope, $resource) {
        'use strict';

        var service = {};

        service.projects = [];
        service.copyProject = {};
        service.currentProject = {};

        service.getProjects = function (userId) {
            var self = this;

            var success = function (response) {

                // Make changes to mainApp.
                self.projects = response;

                if (self.projects.length > 0) {
                    // Select the first project if none already selected;
                    if (!self.currentProject.id)
                        self.currentProject = self.projects[0];
                }

                $rootScope.$broadcast('projectsReceived');
            };

            var failure = function (xhr) {
                toastr.error('Failed to Get Projects.');
            };

            self.resource.query({ userId: userId }, success, failure);
        };

        service.setProject = function (project) {
            this.currentProject = project;

            localStorage.setItem('currentProject', JSON.stringify(project));

            $rootScope.$broadcast('projectChanged');
        };

        service.saveProject = function (project) {
            var self = this;

            var success = function (response) {
		        toastr.success('Saved Project ' + response.title);

		        self.setProject(response);
		        self.projects.push(response);
		        $rootScope.$broadcast('projectSaved');
		    };

		    var failure = function (xhr) {
		        toastr.error('Failed to Save Project.');
		    };

		    if (self.projects.length === 0)
		        self.currentProject = {};

		    self.resource.save(project, success, failure);
        };

        service.getProject = function (id) {
            var self = this;

            var success = function (response) {
                toastr.success('Saved Project ' + response.title);

                self.copyProject = response;
                $rootScope.$broadcast('projectRetrieved');
            };

            var failure = function (xhr) {
                toastr.error('Failed to Get Project.');
            };

            self.resource.get({ id: id }, success, failure);

        };

        service.deleteProject = function (project) {
            var self = this;

            var success = function (response) {
                $rootScope.$broadcast('projectDeleted');

                self.currentProject = {};
                localStorage.removeItem('currentProject');
            };

            var failure = function (xhr) {
                toastr.error('Failed to Delete Project.');
            };

            self.resource.delete({ id: project.id }, success, failure);

        };

        service.saveCopy = function (project, originalId) {
            var self = this;

            var success = function (response) {
                toastr.success('Saved Project ' + response.title);

                self.setProject(response);
                self.projects.push(response);
                $rootScope.$broadcast('projectSaved');
            };

            var failure = function (xhr) {
                toastr.error('Failed to Save Project.');
            };

            if (self.projects.length === 0)
                self.currentProject = {};

            self.copyResource.save({ project: project, originalId: originalId }, success, failure);
        };


        service.resource = $resource('api/v1/projects/:id', {}, {
            query: { method: 'GET', isArray: true }
        });


        service.copyResource = $resource('api/v1/project-copy', {}, {
            query: { method: 'GET', isArray: true }
        });

        return service;
    }]);
///#source 1 1 /Scripts/generator/services/powerWords.js
angular.module('services.power-words', ['ngResource'])
    .factory('PowerWordsService', ['$rootScope', '$resource', function ($rootScope, $resource) {
        'use strict';

        var service = {};

        //service.selectedSection = {};

        //service.selectSection = function (section) {
        //    this.selectedSection = section;

        //    localStorage.setItem('currentSection', JSON.stringify(section));

        //    $rootScope.$broadcast('selectSection');
        //};

        //service.getSection = function () {
        //    return JSON.parse(localStorage.getItem("currentSection") || this.selectedSection);
        //}

        service.resource = $resource('api/power-words/:id', {}, {
            query: { method: 'GET', isArray: true }
        });

        return service;
    }]);
///#source 1 1 /Scripts/generator/services/notification.js
angular.module('services.notification', ['ngResource'])
    .factory('NotificationService', ['$rootScope', '$resource', function ($rootScope, $resource) {
        'use strict';

        var service = {};

        service.notifications = [];
        service.currentNotification = {};

        service.getNotifications = function () {
            var self = this;

            var success = function (response) {
                service.notifications = response;

                $rootScope.$broadcast('notificationsRetrieved');
            };

            var failure = function (xhr) {
                $rootScope.$broadcast('notificationsRetrievedFailed');
            };

            self.resource.query(success, failure);
        };

        service.getUserNotifications = function (user) {
            var self = this;

            var success = function (response) {
                service.notifications = response;

                $rootScope.$broadcast('userNotificationsRetrieved');
            };

            var failure = function (xhr) {
                $rootScope.$broadcast('userNotificationsRetrievedFailed');
            };

            self.userNotificationResource.query({ id: user.id }, success, failure);
        };

        service.getNotification = function (notificationId) {
            var self = this;

            var success = function (response) {
                self.currentNotification = response;
                $rootScope.$broadcast('notificationRetrieved');
            };

            var failure = function (xhr) {
                $rootScope.$broadcast('notificationRetrievedFailed');
            };

            self.resource.get({ id: notificationId }, success, failure);
        };

        service.saveNotification = function (notification) {
            var self = this;

            var success = function (response) {
                self.currentNotification = response;
                $rootScope.$broadcast('notificationSaved');
            };

            var failure = function (xhr) {
                $rootScope.$broadcast('notificationSavedFailed');
            };

            self.resource.save(notification, success, failure);
        };

        service.deleteNotification = function (user, notification) {
            var self = this;

            var success = function (response) {
                $rootScope.$broadcast('notificationDeleted');
            };

            var failure = function (xhr) {
                $rootScope.$broadcast('notificationDeletedFailed');
            };

            self.userNotificationResource.remove({ id: user.id, notificationId: notification.id }, success, failure);
        };

        service.resource = $resource('api/notifications/:id', {}, {
            query: { method: 'GET', isArray: true }
        });

        service.userNotificationResource = $resource('api/v1/notifications/user/:id', {}, {
            query: { method: 'GET', isArray: true }
        });

        return service;
    }]);
///#source 1 1 /Scripts/generator/services/note.js
angular.module('services.note', ['ngResource'])
    .factory('NoteService', ['$rootScope', '$resource', function ($rootScope, $resource) {
        'use strict';

        var service = {};

        service.notes = [];
        service.currentNote = JSON.parse(localStorage.getItem('currentNote')) || {};

        service.getNotes = function (projectId) {
            var self = this;

            var success = function (response) {
                // Make changes to mainApp.
                self.notes = response;

                $rootScope.$broadcast('notesRetrieved');
            };

            var failure = function (xhr) {
                toastr.error('Failed to Get notes.');
            };

            self.resource.query({ projectId: projectId }, success, failure);
        };

        service.setNote = function (note) {
            this.currentNote = note;

            localStorage.setItem('currentNote', JSON.stringify(note));

            $rootScope.$broadcast('noteChanged');
        };

        service.saveNote = function (note) {
            var self = this;

            var success = function (response) {
                self.setNote(response);

                // If the slide has no id, it is new, so add to list of slides.
                if (!note.id) {
                    self.notes.push(response);
                }

                self.currentNote = {};

                $rootScope.$broadcast('noteSaved');

                toastr.success('Note Saved');
            };

            var failure = function () {
                toastr.error('Problem saving note. Make sure you have created a VSL Project by clicking "New VSL" below.');

                $rootScope.$broadcast('noteSavedError');
            };

            if (note.userNote && (note.userNote != ''))
                self.resource.save(note, success, failure);
        };

        service.deleteNote = function (note) {
            var self = this;

            var success = function (response) {
                toastr.success('Note deleted');

                var foundIndex;

                self.notes.forEach(function (item, index) {
                    if (item.id == note.id)
                        foundIndex = index;
                });

                self.notes.splice(foundIndex, 1);

                self.currentNote = {};
                localStorage.removeItem('currentNote');

                $rootScope.$broadcast('noteDeleted');
            };

            var failure = function () {
                toastr.error('Problem deleting note');
            };

            self.resource.remove({ id: note.id }, success, failure);
        };

        service.resource = $resource('api/v1/notes/:noteId', {}, {
            query: { method: 'GET', isArray: true }
        });

        return service;
    }]);
///#source 1 1 /Scripts/generator/services/login.js
angular.module('services.login', ['ngResource'])
    .factory('LoginService', ['$rootScope', '$resource', '$window', function ($rootScope, $resource, $window) {
        'use strict';

        var service = {};

        service.user = JSON.parse(localStorage.getItem("user")) || {};
        service.firstName = localStorage.getItem("firstName") || '';
        service.userId = localStorage.getItem("userId") || '';
        service.redirect = null;

        service.error = {};

        service.returnPath = '';

        service.login = function (data, redirect) {
            var self = this;

            var success = function (response) {
                // Save the login info so that the user doesn't have to login
                // login again from the current device/browser.
                localStorage.setItem('user', JSON.stringify(response));
                localStorage.setItem('firstName', response.firstName);
                localStorage.setItem('userId', response.id);

                service.firstName = response.firstName;
                service.userId = response.id;
                service.user = response;

                $rootScope.$broadcast('loggedIn');
                $rootScope.$broadcast('loginRenewed');
            };

            var failure = function (xhr) {
                $window.alert('Login Failed: ' + xhr.data.responseStatus.message);
                $rootScope.$broadcast('loggedInFailed');
            };

            service.redirect = redirect;

            self.resource.save(data, success, failure);
        };

        service.logout = function (data, returnPath) {
            var self = this;

            var success = function (response) {
                // Save the login info so that the user doesn't have to login
                // login again from the current device/browser.
                localStorage.removeItem('firstName');
                localStorage.removeItem('userId');
                localStorage.removeItem('user');

                service.firstName = null;
                service.userId = null;
                service.user = {};

                $rootScope.$broadcast('loggedOut');
            };

            var failure = function (xhr) {
                // Save the login info so that the user doesn't have to login
                // login again from the current device/browser.
                localStorage.removeItem('firstName');
                localStorage.removeItem('userId');

                service.firstName = null;
                service.userId = null;

                $rootScope.$broadcast('loggedOut');
            };

            self.returnPath = returnPath;

            self.logoutResource.save(data, success, failure);
        };

        service.renewLogin = function (data) {
            var self = this;

            var success = function (response) {
                $rootScope.$broadcast('loginRenewed');
            };

            var failure = function (xhr) {
                $window.alert("You have been logged out due to inactivity. Don't worry, if you got this message after clicking a save or continue button, your data was saved.");

                $rootScope.$broadcast('autoLogout');
            };
            
            self.renewLoginResource.save(data, success, failure);
        };

        service.changePassword = function (data) {
            var self = this;

            var success = function (response) {
                $rootScope.$broadcast('passwordChanged');
            };

            var failure = function (xhr) {
                self.error = xhr.data.responseStatus;
                $rootScope.$broadcast('passwordChangeFailed');
            };

            self.changePasswordResource.save(data, success, failure);
        };

        service.forgotPassword = function (data) {
            var self = this;

            var success = function (response) {
                $rootScope.$broadcast('passwordForgottenProcessed');
            };

            var failure = function (xhr) {
                self.error = xhr.data.responseStatus;
                $rootScope.$broadcast('passwordForgottenFailed');
            };

            self.PasswordForgottenResource.save(data, success, failure);
        };

        service.PasswordForgottenResource = $resource('api/forgot-password', {}, {
            query: { method: 'GET', isArray: true }
        });

        service.changePasswordResource = $resource('api/change-password', {}, {
            query: { method: 'GET', isArray: true }
        });

        service.renewLoginResource = $resource('api/renew-login', {}, {
            query: { method: 'GET', isArray: true }
        });

        service.logoutResource = $resource('api/logout', {}, {
            query: { method: 'GET', isArray: true }
        });

        service.resource = $resource('api/login', {}, {
            query: { method: 'GET', isArray: true }
        });

        return service;
    }]);
///#source 1 1 /Scripts/generator/services/license.js
angular.module('services.license', ['ngResource'])
    .factory('LicenseService', ['$rootScope', '$resource', function ($rootScope, $resource) {
        'use strict';

        var service = {};

        service.license = null;

        service.getLicense = function (data) {
            var self = this;

            var success = function (response) {
                toastr.success('Purchases Retrieved.');

                // Make changes to mainApp.
                self.license = response;


                $rootScope.$broadcast('licenseReceived');
            };

            var failure = function (xhr) {
                $rootScope.$broadcast('licenseFailed');
            };

            self.resource.get(data, success, failure);
        };

        service.saveLicense = function (data) {
            var self = this;

            var success = function (response) {
                // Make changes to mainApp.
                self.license = response;


                $rootScope.$broadcast('licenseSaved');
            };

            var failure = function (xhr) {
                $rootScope.$broadcast('licenseSaveFailed');
            };

            self.resource.save(data, success, failure);
        };

        service.deleteLicense = function (data) {
            var self = this;

            var success = function (response) {
                $rootScope.$broadcast('deleteLicenseSuccess');
            };

            var failure = function (xhr) {
                $rootScope.$broadcast('deleteLicenseFailed');
            };

            self.resource.delete(data, success, failure);
        };

        service.resource = $resource('api/license/:id/:action', {}, {
            query: { method: 'GET', isArray: true }
        });

        return service;
    }]);
///#source 1 1 /Scripts/generator/services/facebook.js
angular.module('services.facebook', ['ngResource'])
    .factory('FacebookService', ['$rootScope', '$resource', function ($rootScope, $resource) {
        'use strict';

        var service = {};

        service.FB = {};
        service.authResponse = null;
        service.error = null;

        service.permissions = null;
        service.group = null;
        service.groupPosts = [];

        service.userGroups = null;

        $rootScope.$on('Facebook:statusChange', function (event, response) {
            $rootScope.$apply(function () {
                service.authResponse = response;
            });
            $rootScope.$broadcast("Facebook:authChange", response);
        });

        $rootScope.$on('Facebook:authResponseChange', function (event, response) {
            $rootScope.$apply(function () {
                service.authResponse = response;
            });
            $rootScope.$broadcast("Facebook:authChange", response);
        });

        service.getGroup = function () {
            var self = this;

            FB.api('/140985849445361/feed', {limit: 50}, function (response) {
                if (!response || response.error) {                    
                    $rootScope.$apply(function () {
                        self.error = response.error;
                    });
                } else {
                    $rootScope.$apply(function () {
                        self.group = response;
                        self.groupPosts = response.data;
                    });

                    $rootScope.$broadcast("Facebook:postsRetrieved", self.groupPosts);
                }
            });
        };

        service.getPermissions = function () {
            var self = this;

            FB.api('/me/permissions', function (response) {
                if (response && response.data && response.data.length) {
                    self.permissions = response.data.shift();
                }

                $rootScope.$broadcast("Facebook:permissionsReceived", response);
            });
        };

        service.sendPost = function (message) {
            var self = this;

            FB.api("/140985849445361/feed", 'post', { message: message }, function (response) {
                console.log(response);

                if (!response || response.error) {
                    if (response.error) {
                        // User hasn't authorized us to post
                        if (response.error.type === 'OAuthException') {
                            // Have the user provide permission to post.
                            FB.login(function (response) {
                                // If we have a response, try to post again.
                                if (response.authResponse)
                                    self.sendPost();
                            }, { scope: 'user_groups,publish_actions' });
                        }
                    };
                } else {
                    self.getPost(response.id)

                    $rootScope.$broadcast("Facebook:postSent", response);
                }
            });
        };

        service.login = function () {
            FB.login(function (response) {

            }, { scope: 'user_groups,publish_actions,publish_stream' });
        };

        service.getPost = function (id) {
            FB.api("/" + id + "/", function (response) {
                console.log(response);
                self.groupPosts.splice(0, 0, response);
                $rootScope.$broadcast("Facebook:postRetrieved", response);
            });
        };

        service.sendComment = function (id, comment) {
            self = this;

            FB.api("/" + id + "/comments", 'post', { message: comment }, function (response) {
                console.log(response);

                if (!response || response.error) {
                    if (response.error) {
                    };
                } else {
                    self.getComment(response.id)

                    $rootScope.$broadcast("Facebook:commentSent", response);
                }
            });
        };

        service.getComment = function (id) {
            FB.api("/" + id + "/", function (response) {
                self.getGroup();
                $rootScope.$apply();
                $rootScope.$broadcast("Facebook:commentRetrieved", response);
            });
        };

        service.like = function (id) {
            FB.api('/' + id + '/likes', 'post', function (response) {
                self.getGroup();
                $rootScope.$apply();
                $rootScope.$broadcast("Facebook:likeSent", response);
            });
        };

        service.unLike = function (id) {
            FB.api('/' + id + '/likes', 'delete', function (response) {
                self.getGroup();
                $rootScope.$apply();
                $rootScope.$broadcast("Facebook:unLikeSent", response);
            });
        };

        service.getUserGroups = function () {
            FB.api('/me/groups', function (response) {
                $rootScope.$broadcast("Facebook:groupsReceived", response);
            });
        };

        return service;
    }]);
///#source 1 1 /Scripts/generator/services/download.js
angular.module('services.download', ['ngResource'])
    .factory('DownloadService', ['$resource', function ($resource) {
        'use strict';

        return $resource('api/download', {}, {
            query: { method: 'GET', isArray: true }
        });
    }]);
///#source 1 1 /Scripts/generator/services/answer.js
angular.module('services.answer', ['ngResource'])
    .factory('AnswerService', ['$rootScope', '$resource', function ($rootScope, $resource) {
        'use strict';

        var service = {};

        service.answers = [];
        service.currentAnswer = {};
        service.totalAnswers = 0;

        service.getAnswers = function (questionId) {
            var self = this;
            self.answers = [];
            self.currentAnswer = {};

            var success = function (response) {
                // Make changes to mainApp.
                //self.questions = response.results;
                self.totalAnswers = response.totalAnswers;

                // push onto the existing questions for infinite add more on single page.
                angular.forEach(response.results, function (value, key) {
                    self.answers.push(value);
                });

                $rootScope.$broadcast('answersReceived');
            };

            var failure = function (xhr) {
                $rootScope.$broadcast('answersFailed');
            };

            self.questionResource.get({ id: questionId }, success, failure);
        };

        service.saveAnswer = function () {
            var self = this;

            var success = function (response) {
                // Make changes to mainApp.
                self.currentAnswer = {};

                // refresh the list of answers for the question.
                self.getAnswers(response.questionId);

                $rootScope.$broadcast('answerSaved');
            };

            var failure = function (xhr) {
                $rootScope.$broadcast('answerSaveFailed');
            };

            self.answerResource.save(self.currentAnswer, success, failure);
        };

        service.upVote = function (answer) {
            var self = this;

            var success = function (response) {
                // refresh the list of answers for the question.
                self.getAnswers(response.questionId);
                
                $rootScope.$broadcast('questionUpVoteSaved');
            };

            var failure = function (xhr) {
                self.errorMessage = xhr.data.responseStatus.message;
                $rootScope.$broadcast('questionUpVoteFailed');
            };

            self.answerResource.upVote(answer, success, failure);
        };

        service.downVote = function (answer) {
            var self = this;

            var success = function (response) {
                // refresh the list of answers for the question.
                self.getAnswers(response.questionId);

                $rootScope.$broadcast('questionDownVoteSaved');
            };

            var failure = function (xhr) {
                self.errorMessage = xhr.data.responseStatus.message;
                $rootScope.$broadcast('questionUpVoteFailed');
            };

            self.answerResource.downVote(answer, success, failure);
        };

        service.questionResource = $resource('api/questions/:id/answers', {}, {
            query: { method: 'GET', isArray: true }
        });

        service.answerResource = $resource('api/answers/:id/:action', {id:'@id'}, {
            query: { method: 'GET', isArray: true },
            upVote: { method: 'POST', params: { action: 'upvote' } },
            downVote: { method: 'POST', params: { action: 'downvote' } }
        });

        return service;
    }]);
///#source 1 1 /Scripts/generator/services/adminLogin.js
angular.module('services.admin.login', ['ngResource'])
    .factory('AdminLoginService', ['$resource', function ($resource) {
        'use strict';

        return $resource('api/adminlogin', {}, {
            query: { method: 'GET', isArray: true }
        });
    }]);
///#source 1 1 /Scripts/generator/services/account.js
angular.module('services.account', ['ngResource'])
    .factory('AccountService', ['$rootScope', '$resource', function ($rootScope, $resource) {
        'use strict';

        var service = {};

        service.history = {};
        service.accountInfo = null;

        service.getLicenses = function (data) {
            var self = this;

            var success = function (response) {
                // Make changes to mainApp.
                self.accountInfo = response;


                $rootScope.$broadcast('licenseInfoReceived');
            };

            var failure = function (xhr) {
                $rootScope.$broadcast('licenseInfoFailed');
            };

            self.resource.licenses(data, success, failure);
        };

        service.getLicense = function (data) {
            var self = this;

            var success = function (response) {
                // Make changes to mainApp.
                self.accountInfo = response;


                $rootScope.$broadcast('licenseInfoReceived');
            };

            var failure = function (xhr) {
                $rootScope.$broadcast('licenseInfoFailed');
            };

            self.resource.licenses(data, success, failure);
        };

        service.resource = $resource('api/account/:id/:action', {}, {
            query: { method: 'GET', isArray: true },
            purchases: { method: 'GET', params: { action: 'purchases' } },
            licenses: { method: 'GET', params: { action: 'licenses' } }
        });

        return service;
    }]);
///#source 1 1 /Scripts/generator/filters/nl2br.js
angular.module('filters.nl2br', []).
    filter('nl2br', ['$filter', function ($filter) {
        'use strict';

        return function (text) {
            // Only process if there is a value to process.
            if (text && (text !== '')) {
                var returnText = ('' + text).replace(/\n/g, "<br />");
                return returnText;
            }
        }
    }])

    .filter('br2nl', ['$filter', function ($filter) {
        'use strict';

        return function (text) {
            // Only process if there is a value to process.
            if (text && (text !== '')) {
                var returnText = ('' + text).replace(/<br \/>/g, "\n");
                return returnText;
            }
        }
    }]);
///#source 1 1 /Scripts/generator/filters/jsonDate.js
angular.module('filters.jsonDate', []).
    filter('jsonDate', ['$filter', function ($filter) {
        'use strict';

        return function (jsonDate) {
            // Only process if there is a value to process.
            if (jsonDate) {
                var date = new Date(parseInt(jsonDate.substr(6)));

                return $filter('date')(date, "MM-dd-yyyy 'at' hh:mm a");
            }
        }
    }]).
    filter('jsonDateShort', ['$filter', function ($filter) {
        'use strict';

        return function (jsonDate) {
            // Only process if there is a value to process.
            if (jsonDate) {
                var date = new Date(parseInt(jsonDate.substr(6)));

                return $filter('date')(date, "MM/dd/yyyy");
            }
        }
    }]);
///#source 1 1 /Scripts/generator/directives/cancelButton.js
angular.module('directives.cancelButton', [])
    .directive('cancelButton', ['$window', function ($window) {
        return {
            restrict: 'A',
            link: function (scope, elem, attrs) {
                elem.on('click', function () {
                    $window.history.back();
                });
            }
        }
    }]);
///#source 1 1 /Scripts/generator/directives/characterCount.js
angular.module('directives.characterCount', [])
    .directive('characterCount', ['$window', function ($window) {
        return {
            restrict: 'A',
            link: function (scope, elem, attrs) {
                var options = {
                    animation: true,
                    content: 'To prevent content overflow in PowerPoint, consider creating a new slide.',
                    title: 'Create Another Slide',
                    placement: 'top',
                    trigger: 'manual'
                };

                var popover = elem.popover(options);

                elem.on('keyup', function () {
                    var charLength = $(this).val().length;

                    var parent = $(elem).parent();
                    var borderDivs = parent.children('div');
                    //title.css('background-color', '#c00');

                    var countSpan = parent.find('>:last-child').children('span');

                    //var countSpan = parent.children('#character-count');
                    $(countSpan).text(charLength);
                    
                    // If too many characters, change the page so that the user
                    // knows there may be issues with their PowerPoint File.
                    if (charLength > 300) {
                        borderDivs.addClass('error');
                        popover.popover('show');
                    } else {
                        if (borderDivs.hasClass('error'))
                            borderDivs.removeClass('error');

                        popover.popover('hide');
                    }
                });
            }
        }
    }]);
///#source 1 1 /Scripts/generator/directives/dropdownToText.js
angular.module('directives.dropdownToText', [])
    .directive('dropdownToText', ['$window', function ($window) {
        return {
            restrict: 'A',
            link: function (scope, elem, attrs) {
                var dropdown = attrs.dropdownToText;

                elem.on('change', function () {
                    insertAtCaret(dropdown, elem.val());
                    $('#' + dropdown).focus();

                    if (scope.currentNote && scope.currentNote.projectId) {
                        scope.currentNote.userNote = $('#' + dropdown).val();
                    }

                    if (scope.currentSlide && scope.currentSlide.projectId) {
                        scope.currentSlide.content = $('#' + dropdown).val();
                    }

                    elem.val('');

                    $('#' + dropdown).trigger('input');
                });

                var insertAtCaret = function (areaId, text) {
                    var txtarea = document.getElementById(areaId);
                    var scrollPos = txtarea.scrollTop;
                    var strPos = 0;
                    var br = ((txtarea.selectionStart || txtarea.selectionStart == '0')
                        ? "ff" : (document.selection ? "ie" : false));

                    if (br == "ie") {
                        txtarea.focus();
                        var range = document.selection.createRange();
                        range.moveStart('character', -txtarea.value.length);
                        strPos = range.text.length;
                    } else if (br == "ff")
                        strPos = txtarea.selectionStart;

                    var front = (txtarea.value).substring(0, strPos);
                    var back = (txtarea.value).substring(strPos, txtarea.value.length);
                    txtarea.value = front + text + back;
                    strPos = strPos + text.length;
                    if (br == "ie") {
                        txtarea.focus();
                        var range = document.selection.createRange();
                        range.moveStart('character', -txtarea.value.length);
                        range.moveStart('character', strPos);
                        range.moveEnd('character', 0); range.select();
                    } else if (br == "ff") {
                        txtarea.selectionStart = strPos;
                        txtarea.selectionEnd = strPos;
                        txtarea.focus();
                    }

                    txtarea.scrollTop = scrollPos;
                }
            }
        }
    }]);
///#source 1 1 /Scripts/generator/directives/facebook.js
angular.module('directives.facebook', [])
    .directive('fb', ['$rootScope', '$window', 'FacebookService', function ($rootScope, $window, facebookService) {
        return {
            restrict: "A",
            link: function (scope, elem, attrs) {
                var fbAppId = attrs.appId || '';

                var settings = {
                    appId: attrs.appId || "",
                    cookie: attrs.cookie || true,
                    status: attrs.status || true,
                    channelUrl: attrs.channelUrl || true,
                    xfbml: attrs.xfbml || true
                };

                // Define fbAsyncInit
                $window.fbAsyncInit = function () {
                    // Initialize our Facebook app
                    $rootScope.$apply(function () {
                        FB.init(settings);
                    });

                    // Broadcast Facebook:load event.
                    $rootScope.$broadcast('Facebook:load', FB);

                    facebookService.FB = FB;

                    /**
                    * Subscribe to Facebook API events and broadcast through app.
                    */
                    angular.forEach({
                        'auth.login': 'login',
                        'auth.logout': 'logout',
                        'auth.prompt': 'prompt',
                        'auth.sessionChange': 'sessionChange',
                        'auth.statusChange': 'statusChange',
                        'auth.authResponseChange': 'authResponseChange',
                        'xfbml.render': 'xfbmlRender',
                        'edge.create': 'like',
                        'edge.remove': 'unlike',
                        'comment.create': 'comment',
                        'comment.remove': 'uncomment'
                    }, function (mapped, name) {
                        FB.Event.subscribe(name, function (response) {
                            $rootScope.$broadcast('Facebook:' + mapped, response);
                        });
                    }
                    );

                };

                // Load Facebook SDK
                var js, fjs = document.getElementsByTagName('script')[0];
                if (document.getElementById('facebook-jssdk')) { return; }
                js = document.createElement('script');
                js.id = 'facebook-jssdk';
                js.src = '../connect.facebook.net/en_US/all/debug.js';
                fjs.parentNode.insertBefore(js, fjs);
            }
        };
    }]);
///#source 1 1 /Scripts/generator/directives/navigation.js
angular.module('directives.navigation', ['services.section'])
    .directive('childNav', ['$compile', 'SectionService', function ($compile, sectionService) {
        var link;
        
        var template =
                '<a href="#{{childSection.path}}" data-target="#child-{{childSection.id}}" data-toggle="collapse">' +
                '    <span class="pull-right" data-ng-show="childSection.childSections.length > 0">&#x25BC;</span>' +
                '    {{childSection.title}}' +
                '</a>' +
                '    <ul id="child-{{childSection.id}}" class="nav nav-list collapse">' +
                '        <li class="nav-header" data-ng-repeat="subSection in childSection.childSections">' +
                '            <div data-child-nav="" data-child-section="subSection"></div>' +
                '        </li>' +
                '    </ul>';

        //var template =
        //        '<a href="#{{childSection.path}}" data-target="#child-{{childSection.id}}" data-toggle="collapse" data-ng-disabled="childSection.path == \'\'">' +
        //        '    {{childSection.title}}' +
        //        '</a>' +
        //        '    <ul id="child-{{childSection.id}}" class="nav nav-list">' +
        //        '        <li class="nav-header" data-ng-repeat="subSection in childSection.childSections">' +
        //        '            <div data-child-nav="" data-child-section="subSection"></div>' +
        //        '        </li>' +
        //        '    </ul>';

        return {
            restrict: 'A',

            scope: {
                childSection: '='
            },

            link: function (scope, elem, attrs) {
                if (!link) {
                    link = $compile(template);
                }

                elem.append(link(scope.$new(), function (clone) { }));

                var aTag = elem.find('a');

                aTag.on('click', function (e) {
                    if (!scope.childSection.path || (scope.childSection.path == ''))
                        e.preventDefault();
                    else
                        sectionService.setCurrentSection(scope.childSection);
                });
            }
        }
    }])
    .directive('navigation', ['$compile', function ($compile) {
        var template =
                '<ul class="nav nav-list">' +
                '    <li class="nav-header" data-ng-repeat="section in selectedSections">' +
                '        <div data-child-nav="" data-child-section="section"></div>' +
                '    </li>' +
                '</ul>';

        return {
            restrict: 'A',

            scope: {
                selectedSections: '='
            },

            link: function (scope, elem, attrs) {
                elem.append(template);

                $compile(elem.contents())(scope.$new());            
            }
        }
    }]);
///#source 1 1 /Scripts/generator/directives/preventDefault.js
angular.module('directives.preventDefault', [])
    .directive('preventDefault', ['$window', function ($window) {
        return {
            restrict: 'A',
            link: function (scope, elem, attrs) {
                elem.on('click', function (e) {
                    e.preventDefault();
                });

                elem.on('submit', function (e) {
                    e.preventDefault();
                });
            }
        }
    }]);
///#source 1 1 /Scripts/generator/directives/preventIfNoPath.js
angular.module('directives.preventIfNoPath', [])
    .directive('preventIfNoPath', ['$window', function ($window) {
        return {
            restrict: 'A',
            link: function (scope, elem, attrs) {
                elem.on('click', function (e) {
                    if (!scope.section.path || (scope.section.path == ''))
                        e.preventDefault();

                    // If there is a target, open it
                    if (scope.section.pathTarget && scope.section.path && (scope.section.pathTarget != '') && (scope.section.path != '')) {
                        e.preventDefault();
                        window.open(scope.section.path, scope.section.pathTarget);
                    }
                });
            }
        }
    }]);
///#source 1 1 /Scripts/generator/directives/scroller.js
angular.module('directives.scroller', [])
    .directive('scroller', ['$window', 'ProjectService', function ($window, projectService) {
        return {
            restrict: 'A',
            link: function (scope, elem, attrs) {
                $(".scroller").scrollable();

                var scrollable = $(".scroller").data("scrollable");

                var startIndex;

                scope.$watch('projects', function () {
                    // Enable next button if there are more items.
                    if ($('.items').width() > $('.scroller').width())
                        scope.scrollMore = true;

                    // Disable previous button if on frist item.
                    scrollable.onSeek = function (e, index) {
                        if (scrollable.getIndex() == 0) {
                            $('.back').addClass('disabled');
                        } else {
                            if ($('.back').hasClass('disabled'))
                                $('.back').removeClass('disabled');
                        }

                        if (scope.scrollMore === false) {
                            $('.forward').addClass('disabled');
                        } else {
                            if ($('.forward').hasClass('disabled'))
                                $('.forward').removeClass('disabled');
                        }
                    };
                });
            }
        }
    }])
    .directive('scrollRight', ['$window', 'ProjectService', function ($window, projectService) {
        return {
            restrict: 'A',
            link: function (scope, elem, attrs) {
                // Get the project scroller.
                var scrollable = $(".scroller").data("scrollable");

                elem.on("click", function (e) {
                    // Get the width of the scroller area.
                    var scrollerWidth = $('.scroller').width();

                    // Get the scroller items.
                    var items = scrollable.getItems();

                    var currentIndex = scrollable.getIndex();

                    var itemList = Array();

                    // The width of the items already in itemList.
                    var itemsWidth = 0;

                    // The width of the items that will be scrolled next (if any).
                    var nextWidth = 0;

                    $.each(items, function (i, val) {
                        if (i >= currentIndex) {
                            // If the items width, plus this item + 10 (for margin) + 29
                            // (for padding) are less than scrollerWidth then add the 
                            // item to the itemList
                            if ((itemsWidth + $(val).width() + 10 + 29) < scrollerWidth) {
                                itemList.push(items[i]);
                                itemsWidth += $(val).width() + 10 + 29;
                            } else {
                                nextWidth += $(val).width() + 10 + 29;
                            }
                        }
                    });

                    scope.scrollMore = (nextWidth > scrollerWidth);

                    // Set the amount to scroll by.
                    var scrollSize = (itemList.length > 1) ? itemList.length : 1;

                    scrollable.move(scrollSize);
                });
            }
        }
    }])
    .directive('scrollLeft', ['$window', 'ProjectService', function ($window, projectService) {
        return {
            restrict: 'A',
            link: function (scope, elem, attrs) {
                var scrollable = $(".scroller").data("scrollable");

                elem.on("click", function (e) {
                    // Get the width of the scroller area.
                    var scrollerWidth = $('.scroller').width();

                    // Get the scroller items.
                    var items = scrollable.getItems();

                    var currentIndex = scrollable.getIndex();

                    var itemList = Array();

                    // The width of the items already in itemList.
                    var itemsWidth = 0;

                    var arrayItems = Array();

                    $.each(items, function (i, val) {
                        arrayItems.push(val);
                    });

                    $.each(arrayItems.reverse(), function (i, val) {
                        if (i >= (items.length - currentIndex)) {
                            // If the items width, plus this item + 10 (for margin) + 29
                            // (for padding) are less than scrollerWidth then add the 
                            // item to the itemList
                            if ((itemsWidth + $(val).width() + 10 + 29) < scrollerWidth) {
                                itemList.push(items[i]);
                                itemsWidth += $(val).width() + 10 + 29;
                            } else {
                                return false;
                            }
                        }
                    });

                    scope.scrollMore = true;

                    // Set the amount to scroll by.
                    var scrollSize = (itemList.length > 1) ? itemList.length : 1;

                    scrollable.move(scrollSize * -1);
                });
            }
        }
    }]);
///#source 1 1 /Scripts/generator/directives/secureFile.js
angular.module('directives.secureFile', ['services.download'])
    .directive('secureFile', ['$window', 'DownloadService', function ($window, downloadService) {
        'use strict';

        return {
            restrict: 'A',

            link: function (scope, elem, attrs) {
                var success = function (response) {

                    elem.html('<a href="' + response.secureUrl.trim() + '" target="_blank">' + attrs.secureText + '</a>');
                };

                var failure = function (xhr) {
                    toastr.error('Failed to provide secure URL for file ' + $scope.video);
                };

                downloadService.get({ 'file': attrs.secureFile }, success, failure);
            }
        };
    }]);
///#source 1 1 /Scripts/generator/directives/showProgress.js
angular.module('directives.showProgress', [])
    .directive('showProgress', ['$window', function ($window) {
        return {
            restrict: 'A',
            link: function (scope, elem, attrs) {
                var dots = window.setInterval(function () {
                    var wait = $('#dots');
                    if (wait.html().length > 5)
                        wait.html("");
                    else
                        wait.html(wait.html() + " .");
                }, 500);

                elem.on('click', function () {
                    $window.history.back();
                });
            }
        }
    }]);
///#source 1 1 /Scripts/generator/directives/toggleNotes.js
angular.module('directives.toggleNotes', [])
    .directive('toggleNotes', ['$window', function ($window) {
        return {
            restrict: 'A',
            link: function (scope, elem, attrs) {
                elem.on('click', function () {
                    // Toggle whether to show or hide all slides
                    if (elem.hasClass('show-all')) {
                        elem.removeClass('show-all');
                        elem.addClass('hide-all');

                        $('#collapseTwo section ul').removeClass('in');
                        $('#collapseTwo section ul').css('height', '0');
                    } else {
                        elem.addClass('show-all');
                        elem.removeClass('hide-all');
                        elem.removeClass('collapse');

                        $('#collapseTwo section ul').addClass('in');
                        $('#collapseTwo section ul').css('height', 'auto');
                    }
                });
            }
        }
    }]);
///#source 1 1 /Scripts/generator/directives/toggleSlides.js
angular.module('directives.toggleSlides', [])
    .directive('toggleSlides', ['$window', function ($window) {
        return {
            restrict: 'A',
            link: function (scope, elem, attrs) {
                elem.on('click', function () {
                    // Toggle whether to show or hide all slides
                    if (elem.hasClass('show-all')) {
                        elem.removeClass('show-all');
                        elem.addClass('hide-all');

                        $('#collapseOne section ul').removeClass('in');
                        $('#collapseOne section ul').css('height', '0');
                    } else {
                        elem.addClass('show-all');
                        elem.removeClass('hide-all');
                        elem.removeClass('collapse');

                        $('#collapseOne section ul').addClass('in');
                        $('#collapseOne section ul').css('height', 'auto');
                    }
                });
            }
        }
    }]);
///#source 1 1 /Scripts/generator/directives/videoPlayer.js
angular.module('directives.videoPlayer', ['services.section'])
    .directive('videoPlayer', ['$window', 'SectionService', function ($window, sectionService) {
        'use strict';

        return {
            restrict: 'A',
            link: function (scope, elem, attrs) {
                var player;

                attrs.$observe('videoPlayer', function (value) {
                    if (value && (value != '')) {
                        elem.html(
                            '<video poster="http://d1qgj02f4qbohm.cloudfront.net/VideoSplash.jpg" preload="none"> ' +
                            ' <source type="video/mp4" src="' + $.trim(value) + '" />' +
                            '</video>');


                        player = $(elem).flowplayer({
                            engine: 'html5'
                        });
                    }
                });

                scope.$on('$routeChangeStart', function(next, current) { 
                    //player = $(elem).flowplayer({
                    //    engine: 'html5'
                    //});

                    player.stop();
                    player.unload();
                });
            }
        };
    }])
    .directive('videoPlayerLogin', ['$window', 'SectionService', function ($window, sectionService) {
        'use strict';

        return {
            restrict: 'A',
            link: function (scope, elem, attrs) {

                attrs.$observe('videoPlayerLogin', function (value) {
                    if (value && (value != '')) {
                        elem.html(
                            '<video poster="/content/images/login-video.jpg" preload="none"> ' +
                            ' <source type="video/mp4" src="' + $.trim(value) + '" />' +
                            '</video>');


                        var player = $(elem).flowplayer({
                            engine: 'html5'
                        });
                    }
                });
            }
        };
    }]);
///#source 1 1 /Scripts/generator/controllers/account.js
angular.module('controllers.account', [
    'services.account',
    'ngRoute'])

	.config(['$routeProvider', function ($routeProvider) {
	    'use strict';

	    $routeProvider
            .when('/account', { templateUrl: 'partial/account/index.html', controller: 'AccountController' })
            .when('/account/users', { templateUrl: 'partial/account/users.html', controller: 'AccountUserController' })
            .when('/account/users/:id', { templateUrl: 'partial/account/user-form.html', controller: 'AccountUserFormController' });
	}])

	.controller('AccountController', ['$scope', '$location', '$window', 'AccountService', 'LicenseService', 'UserService',
		function ($scope, $location, $window, service, licenseService, userService) {
		    'use strict';

		    $scope.$parent.title = "My Account";

		    $scope.purchases = [];
		    $scope.availableProducts = [];
		    $scope.accountInfo = null;
		    $scope.user = userService.user;

		    $scope.accountOwner = null;
		    $scope.isAccountOwner = false;

		    $scope.$on('licenseInfoReceived', function () {
		        $scope.$parent.progress = false;

		        $scope.accountOwner = getOwnerLicense(service.accountInfo.account.email, service.accountInfo.licenses)[0];

		        $scope.isAccountOwner = ($scope.accountOwner.email === userService.user.email);

		        $scope.accountInfo = service.accountInfo;
		        $scope.canAddLicenses = $scope.accountInfo.licensesAllowed > $scope.accountInfo.licensesUsed;

		        var canAdd = $scope.canAddLicenses;
		    });

		    $scope.$on('licenseInfoFailed', function () {
		        $scope.$parent.progress = false;

		        toastr.error('Failed to Get License Info.');
		    });

		    //$scope.$on('purchasesReceived', function () {
		    //    $scope.purchases = service.history.purchases;
		    //    $scope.availableProducts = service.history.unpurchasedProducts;
		    //});

		    $scope.$on('deleteLicenseSuccess', function () {
		        $scope.$parent.progress = false;

		        service.getLicenses({ id: userService.user.accountId });

		        // Get the current list of licenses
		        service.getLicenses({ id: userService.user.accountId });
		    });

		    $scope.$on('deleteLicenseFailed', function () {
		        $scope.$parent.progress = false;

		        toastr.error('Failed to Delete License.');
		    });

		    $scope.addUser = function () {
		        if ($scope.accountInfo.licensesAllowed > $scope.accountInfo.licensesUsed)
		            $location.path('/account/users/0');
		        else
		            $window.alert('You have already assigned all of your licenses');
		    };

		    $scope.canDelete = function (email) {
		        return $scope.accountInfo.account.email !== email;
		    };

		    $scope.deleteLicense = function (license) {
		        if ($window.confirm("Are you sure that you want to delete this user?")) {
		            $scope.$parent.progress = true;

		            licenseService.deleteLicense(license);
		        }
		    };

		    $scope.ownerLicenseFilter = function (license) {
		        return license.email != $scope.accountOwner.email;
		    };

		    var getOwnerLicense = function (email, licenses) {
		        return licenses.filter(function (elem, index, array) {
		            return elem.email === email;
		        });
		    };

		    var init = function () {
		        $scope.$parent.progress = true;

		        service.getLicenses({ id: userService.user.accountId });
		    };

		    init();
		}])

	.controller('AccountUserController', ['$scope', '$location', '$window', 'AccountService', 'UserService', 'LicenseService',
		function ($scope, $location, $window, service, userService, licenseService) {
		    'use strict';

		    $scope.$parent.title = "Account Users";
		    $scope.accountInfo = null;
		    $scope.canAddLicenses = false;

		    $scope.$on('licenseInfoReceived', function () {
		        $scope.$parent.progress = false;

		        $scope.accountInfo = service.accountInfo;
		        $scope.canAddLicenses = $scope.accountInfo.licensesAllowed > $scope.accountInfo.licensesUsed;

		        var canAdd = $scope.canAddLicenses;
		    });

		    $scope.$on('licenseInfoFailed', function () {
		        $scope.$parent.progress = false;

		        toastr.error('Failed to Get License Info.');
		    });

		    $scope.$on('deleteLicenseSuccess', function () {
                // Get the current list of licenses
		        service.getLicenses({ id: userService.user.accountId });
		    });

		    $scope.$on('deleteLicenseFailed', function () {
		        $scope.$parent.progress = false;
		        toastr.error('Failed to Delete License.');
		    });

		    $scope.canDelete = function (email) {
		        return $scope.accountInfo.account.email !== email;
		    };

		    $scope.deleteLicense = function (license) {
		        if ($window.confirm("Are you sure that you want to delete this user?")) {
		            $scope.$parent.progress = true;
		            
		            licenseService.deleteLicense(license);
		        }
		    };

		    var init = function () {
		        $scope.$parent.progress = true;

		        service.getLicenses({ id: userService.user.accountId });
		    };

		    init();
		}])

	.controller('AccountUserFormController', [
        '$scope', '$location', '$routeParams', 'LicenseService', 'UserService', 'AccountService',
		function ($scope, $location, $routeParams, service, userService, accountService) {
		    'use strict';

		    $scope.$parent.title = ($routeParams.id === 0) ? "New User" : "Save User";
		    $scope.license = {};
		    $scope.accountInfo = null;

		    $scope.accountOwner = null;
		    $scope.isAccountOwner = false;

		    $scope.canAddLicense = false;

		    $scope.$on('licenseInfoReceived', function () {
		        $scope.$parent.progress = false;

		        $scope.accountOwner = getOwnerLicense(accountService.accountInfo.account.email, accountService.accountInfo.licenses)[0];

		        $scope.isAccountOwner = ($scope.accountOwner.email === userService.user.email);

		        $scope.accountInfo = accountService.accountInfo;
		        $scope.canAddLicense = $scope.accountInfo.licensesAllowed > $scope.accountInfo.licensesUsed;

		        var canAdd = $scope.canAddLicense;
		    });

		    $scope.$on('licenseInfoFailed', function () {
		        $scope.$parent.progress = false;

		        toastr.error('Failed to Get License Info.');
		    });

		    $scope.$on('licenseReceived', function () {
		        $scope.license = service.license;
		    });

		    $scope.$on('licenseFailed', function () {
		        toastr.error('Failed to Get License.');
		    });

		    $scope.$on('licenseSaved', function () {
		        toastr.success('User Saved.');
		        $scope.license = service.license;

		        $location.path('/account');
		    });

		    $scope.$on('licenseSaveFailed', function () {
		        toastr.error('Failed to Save License.');
		    });

		    $scope.saveLicense = function () {
		        // Add the current users accountId so that this license
                // goes to that account.
		        $scope.license.accountId = userService.user.accountId;

		        service.saveLicense($scope.license);
		    };

		    var getOwnerLicense = function (email, licenses) {
		        return licenses.filter(function (elem, index, array) {
		            return elem.email === email;
		        });
		    };

		    var init = function () {
		        $scope.$parent.progress = true;

		        accountService.getLicenses({ id: userService.user.accountId });

                // Get user info if there is a valid id.
		        if ($routeParams.id !== '0')
		            service.getLicense({ id: $routeParams.id });
		    };

		    init();
		}]);
///#source 1 1 /Scripts/generator/controllers/affiliate.js
angular.module('controllers.affiliate', [
    'services.video',
    'services.slide',
    'ngRoute'])

	.config(['$routeProvider', function ($routeProvider) {
	    'use strict';

	    $routeProvider
            .when('/affiliates', { templateUrl: 'partial/affiliates/index.html', controller: 'AffiliateController' });
	}])

	.controller('AffiliateController', ['$scope',
		function ($scope) {
		    'use strict';

		    $scope.$parent.title = 'Affiliates';


		}]);
///#source 1 1 /Scripts/generator/controllers/boardroom.js
angular.module('controllers.boardroom', [
    'services.video',
    'services.slide',
    'ngRoute'])

	.config(['$routeProvider', function ($routeProvider) {
	    'use strict';

	    $routeProvider
            .when('/boardroom/1-1', { templateUrl: 'partial/boardroom/1-1.html', controller: 'BoardroomController' })
            .when('/boardroom/1-2', { templateUrl: 'partial/boardroom/1-2.html', controller: 'BoardroomController' })
            .when('/boardroom/1-3', { templateUrl: 'partial/boardroom/1-3.html', controller: 'BoardroomController' })
            .when('/boardroom/2-1', { templateUrl: 'partial/boardroom/2-1.html', controller: 'BoardroomController' })
            .when('/boardroom/2-2', { templateUrl: 'partial/boardroom/2-2.html', controller: 'BoardroomController' })
            .when('/boardroom/3-1', { templateUrl: 'partial/boardroom/3-1.html', controller: 'BoardroomController' })
            .when('/boardroom/3-2', { templateUrl: 'partial/boardroom/3-2.html', controller: 'BoardroomController' })
            .when('/boardroom/4-1', { templateUrl: 'partial/boardroom/4-1.html', controller: 'BoardroomController' })
            .when('/boardroom/4-2', { templateUrl: 'partial/boardroom/4-2.html', controller: 'BoardroomController' })
            .when('/boardroom/4-3', { templateUrl: 'partial/boardroom/4-3.html', controller: 'BoardroomController' })
            .when('/boardroom/5-1', { templateUrl: 'partial/boardroom/5-1.html', controller: 'BoardroomController' })
            .when('/boardroom/5-2', { templateUrl: 'partial/boardroom/5-2.html', controller: 'BoardroomController' })
            .when('/boardroom/5-3', { templateUrl: 'partial/boardroom/5-3.html', controller: 'BoardroomController' })
            .when('/boardroom/5-4', { templateUrl: 'partial/boardroom/5-4.html', controller: 'BoardroomController' })
            .when('/boardroom/6-1', { templateUrl: 'partial/boardroom/6-1.html', controller: 'BoardroomController' })
            .when('/boardroom/6-2', { templateUrl: 'partial/boardroom/6-2.html', controller: 'BoardroomController' })
            .when('/boardroom/6-3', { templateUrl: 'partial/boardroom/6-3.html', controller: 'BoardroomController' });
	}])

	.controller('BoardroomController', ['$scope', '$location',
		function ($scope, $location) {
		    'use strict';

		    $scope.step = '';
		    $scope.section = '';

		    $scope.$parent.title = $scope.step + " | " + $scope.section;

		    $scope.$watch('step', function () {
		        $scope.$parent.title = $scope.step + ' | ' + $scope.section;
		    });

		    $scope.$watch('section', function () {
		        $scope.$parent.title = $scope.step + ' | ' + $scope.section;
		    });

		    
		}]);
///#source 1 1 /Scripts/generator/controllers/bonus.js
angular.module('controllers.bonus', [
    'services.video',
    'services.slide',
    'ngRoute'])

	.config(['$routeProvider', function ($routeProvider) {
	    'use strict';

	    $routeProvider
	    	.when('/q-a-recordings/hook-headline', { templateUrl: 'partial/q-a-recordings/hook-headline.html', controller: 'BonusController' })
            .when('/q-a-recordings/3-tips-1', { templateUrl: 'partial/q-a-recordings/3-tips-1.html', controller: 'BonusController' })
            .when('/q-a-recordings/3-tips-2', { templateUrl: 'partial/q-a-recordings/3-tips-2.html', controller: 'BonusController' })
            .when('/q-a-recordings/live-case-studies', { templateUrl: 'partial/q-a-recordings/live-case-studies.html', controller: 'BonusController' })
            .when('/q-a-recordings/snap-suggestion-1', { templateUrl: 'partial/q-a-recordings/snap-suggestion-1.html', controller: 'BonusController' })
            .when('/q-a-recordings/snap-suggestion-2', { templateUrl: 'partial/q-a-recordings/snap-suggestion-2.html', controller: 'BonusController' })
            .when('/q-a-recordings/snap-suggestion-extended', { templateUrl: 'partial/q-a-recordings/snap-suggestion-extended.html', controller: 'BonusController' })
            .when('/q-a-recordings/big-problem-1', { templateUrl: 'partial/q-a-recordings/big-problem-1.html', controller: 'BonusController' })
            .when('/q-a-recordings/big-problem-2', { templateUrl: 'partial/q-a-recordings/big-problem-2.html', controller: 'BonusController' })
            .when('/q-a-recordings/big-solution', { templateUrl: 'partial/q-a-recordings/big-solution.html', controller: 'BonusController' })
            .when('/q-a-recordings/big-solution-extended', { templateUrl: 'partial/q-a-recordings/big-solution-extended.html', controller: 'BonusController' })
            .when('/q-a-recordings/grand-offer-1', { templateUrl: 'partial/q-a-recordings/grand-offer-1.html', controller: 'BonusController' })
            .when('/q-a-recordings/grand-offer-2', { templateUrl: 'partial/q-a-recordings/grand-offer-2.html', controller: 'BonusController' })
            .when('/q-a-recordings/grand-offer-extended', { templateUrl: 'partial/q-a-recordings/grand-offer-extended.html', controller: 'BonusController' })
            .when('/q-a-recordings/robotic-close', { templateUrl: 'partial/q-a-recordings/robotic-close.html', controller: 'BonusController' });
	}])

	.controller('BonusController', ['$scope', '$location', 'VideoService',
		function ($scope, $location, videoService) {
		    'use strict';

		    $scope.$on('$routeChangeSuccess', function (scope, event, current, previous) {
		        if (!$scope.$parent.hasVsl) {
		            $location.path('/buy-vsl');
		        }

		    });

		    $scope.$parent.title = 'Bonus: Q&A Recordings' + ' | ' + $scope.bonusTitle;

		    $scope.$watch('bonusTitle', function () {
		        $scope.$parent.title = 'Bonus: Q&A Recordings' + ' | ' + $scope.bonusTitle;
		    });
	}]);
///#source 1 1 /Scripts/generator/controllers/buyVsl.js
angular.module('controllers.byVsl', [
    'services.video',
    'services.slide',
    'ngRoute'])

	.config(['$routeProvider', function ($routeProvider) {
	    'use strict';

	    $routeProvider
            .when('/buy-vsl', { templateUrl: 'partial/buy-vsl.html', controller: 'BuyVslController' });
	}])

	.controller('BuyVslController', ['$scope', '$location', 'UserService',
		function ($scope, $location, userService) {
		    'use strict';

		    $scope.$parent.title = 'GET FULL ACCESS TODAY!';

		    $scope.$on('$routeChangeSuccess', function (scope, next, current) {
		        // Redirect if user doesn't have at least 3X VSL permissions
		        if ($scope.$parent.hasVsl) {
		            $location.path('/getting-started/watch-first');
		        }
		    });

		    $scope.$on('userRetrieved', function () {
		        if (userService.hasGenerator) {
		            $location.path('/getting-started/watch-first');
		        }
		    });
		}]);
///#source 1 1 /Scripts/generator/controllers/emailFormula.js
angular.module('controllers.emailFormula', [
    'ngRoute'])

	.config(['$routeProvider', function ($routeProvider) {
	    'use strict';

	    $routeProvider
            .when('/email/1-1', { templateUrl: 'partial/email/1-1.html', controller: 'EmailFormulaController' })
            .when('/email/1-2', { templateUrl: 'partial/email/1-2.html', controller: 'EmailFormulaController' })
            .when('/email/1-3', { templateUrl: 'partial/email/1-3.html', controller: 'EmailFormulaController' })
            .when('/email/1-4', { templateUrl: 'partial/email/1-4.html', controller: 'EmailFormulaController' })
            .when('/email/1-5', { templateUrl: 'partial/email/1-5.html', controller: 'EmailFormulaController' });
	}])

	.controller('EmailFormulaController', ['$scope', '$location',
		function ($scope, $location) {
		    'use strict';

		    $scope.$parent.title = $scope.title;
		}]);
///#source 1 1 /Scripts/generator/controllers/faq.js
angular.module('controllers.faq', [
    'services.video',
    'services.slide',
    'ngRoute'])

	.config(['$routeProvider', function ($routeProvider) {
	    'use strict';

	    $routeProvider
            .when('/faq', { templateUrl: 'partial/faq.html', controller: 'FaqController' });
	}])

	.controller('FaqController', ['$scope', '$location', 'VideoService',
		function ($scope, $location, videoService) {
		    'use strict';

		    $scope.$parent.title = 'FAQ';
		}]);
///#source 1 1 /Scripts/generator/controllers/faq2.js
angular.module('controllers.faq2', [
    'services.video',
    'services.slide',
    'filters.jsonDate',
    'ngRoute'])

	.config(['$routeProvider', function ($routeProvider) {
	    'use strict';

	    $routeProvider
            .when('/questions', { templateUrl: 'partial/faq/index.html', controller: 'Faq2Controller' })
            .when('/questions/page/:page', { templateUrl: 'partial/faq/index.html', controller: 'Faq2Controller' })
            .when('/questions/tags/:tag', { templateUrl: 'partial/faq/index.html', controller: 'Faq2Controller' })
            .when('/questions/users/:userId', { templateUrl: 'partial/faq/index.html', controller: 'Faq2Controller' })
            .when('/questions/ask', { templateUrl: 'partial/faq/ask.html', controller: 'AskController' })
            .when('/questions/question/:id', { templateUrl: 'partial/faq/question.html', controller: 'QuestionController' });
	}])

	.controller('Faq2Controller', ['$scope', '$location', '$routeParams', 'QuestionService',
		function ($scope, $location, $routeParams, service) {
		    'use strict';

            // Start fresh with questions when the page loads.
		    $scope.$on('$routeChangeStart', function (scope, event, current, previous) {
		        service.questions = [];
		    });

		    $scope.$parent.title = 'Member Forum';
		    $scope.questions = [];
		    $scope.totalQuestions = 0;
		    $scope.request = {
		        page: 1,
		        tag: ($routeParams.tag) ? $routeParams.tag : '',
		        userId: ($routeParams.userId) ? $routeParams.userId : ''
		    };

		    $scope.page = 1;

		    $scope.$on('questionsReceived', function () {
		        $scope.$parent.progress = false;

		        $scope.questions = service.questions;
		        $scope.totalQuestions = service.totalQuestions;
		    });

		    $scope.showMoreButton = function () {
		        return $scope.questions.length < $scope.totalQuestions;
		    };

		    $scope.getMoreQuestions = function () {
		        $scope.request.page += 1;
		        service.getQuestions($scope.request);
		    };

		    service.getQuestions($scope.request);
		}])
    .controller('AskController', ['$scope', '$location', 'QuestionService',
        function ($scope, $location, service) {
            'use strict';

            $scope.$parent.title = 'Ask a Question';
            $scope.question = service.currentQuestion;

            $scope.saveQuestion = function () {
                $scope.$parent.progress = true;

                service.currentQuestion = $scope.question;

                service.saveQuestion();
            };

            $scope.$on('questionSaved', function () {
                $scope.$parent.progress = false;

                $scope.question = service.currentQuestion;
                var id = service.currentQuestion.id;
                service.currentQuestion = {};

                $location.path('/questions/question/' + id);
            });

            $scope.$on('questionSaveFailed', function () {
                $scope.$parent.progress = false;

                toastr.error("Failed to save question.");
            });

            if (!$scope.question.id) {
                $scope.question.userId = $scope.$parent.userId;
            }
        }])
    .controller('QuestionController', ['$scope', '$location', '$routeParams', 'QuestionService', 'UserService', 'AnswerService',
        function ($scope, $location, $routeParams, service, userService, answerService) {
            'use strict';

            $scope.$parent.title = 'Question Answer';
            $scope.question = service.currentQuestion;
            $scope.answers = [];
            $scope.answer = {};
            $scope.totalAnswers = 0;

            $scope.$on('questionReceived', function () {
                $scope.question = service.currentQuestion;

                $scope.$parent.title = service.currentQuestion.question.title;
            });

            $scope.formatDate = function (jsonDate){
                var date = new Date(parseInt(jsonDate.substr(6)));
                return $filter('date')(date,'MM-dd-yyyy at HH:mm a');
            };
            
            $scope.saveAnswer = function () {
                $scope.answer.userId = userService.userId;
                $scope.answer.questionId = $scope.question.question.id;

                answerService.currentAnswer = $scope.answer;
                answerService.saveAnswer();
            };

            $scope.$on('answerSaved', function () {
                $scope.answer = answerService.currentAnswer;
                $scope.answers = answerService.answers;
            });

            $scope.$on('answersReceived', function () {
                $scope.answers = answerService.answers;
            });

            $scope.upVote = function () {
                service.upVote();
            };

            $scope.downVote = function () {
                service.downVote();
            };

            $scope.$on('questionUpVoteSaved', function () {
                $scope.question = service.currentQuestion;
            });

            $scope.$on('questionUpVoteFailed', function () {
                if (service.errorMessage !== '')
                    toastr.error(service.errorMessage);
                else
                    toastr.error('Failed to tally vote.');

                service.errorMessage = '';
            });

            $scope.$on('questionDownVoteSaved', function () {
                $scope.question = service.currentQuestion;
            });

            $scope.$on('questionDownVoteFailed', function () {
                if (service.errorMessage !== '')
                    toastr.error(service.errorMessage);
                else
                    toastr.error('Failed to tally vote.');

                service.errorMessage = '';
            });

            $scope.answerUpVote = function (answer) {
                answerService.upVote(answer.answer);
            };

            $scope.answerDownVote = function (answer) {
                answerService.downVote(answer.answer);
            };

            $scope.$on('answerUpVoteSaved', function () {
            });

            $scope.$on('answerUpVoteFailed', function () {
                if (answerService.errorMessage !== '')
                    toastr.error(answerService.errorMessage);
                else
                    toastr.error('Failed to tally vote.');

                answerService.errorMessage = '';
            });

            $scope.$on('answerDownVoteSaved', function () {
            });

            $scope.$on('answerDownVoteFailed', function () {
                if (answerService.errorMessage !== '')
                    toastr.error(answerService.errorMessage);
                else
                    toastr.error('Failed to tally vote.');

                answerService.errorMessage = '';
            });

            $scope.canVoteOnQuestion = function () {
                if ($scope.question && $scope.question.question) {
                    var question = $scope.question.question;

                    // Person who wrote the question can't vote on it.
                    if (question.userId === $scope.$parent.user.userId.toString())
                        return false;

                    // A user can only vote once.
                    return userCanVote(question.votes);
                }

                return false;
            };

            $scope.canVoteOnAnswer = function (answer) {
                if (answer && answer.answer) {
                    // User can't vote on their own answer.
                    if (answer.answer.userId === $scope.$parent.user.userId.toString())
                        return false;

                    // A user can only vote once.
                    return userCanVote(answer.answer.votes);
                }

                return false;
            };

            var userCanVote = function (votes) {
                var canVote = true;
                angular.forEach(votes, function (value) {
                    if (value.userId === $scope.$parent.user.userId.toString())
                        canVote = false;
                });

                return canVote;
            };

            service.getQuestion($routeParams.id);
            answerService.getAnswers($routeParams.id);
        }]);
///#source 1 1 /Scripts/generator/controllers/fastTrack.js
angular.module('controllers.fastTrack', [
    'services.video',
    'services.slide',
    'ngRoute'])

	.config(['$routeProvider', function ($routeProvider) {
	    'use strict';

	    $routeProvider
            .when('/fast-track/1-1', { templateUrl: 'partial/fast-track/1-1.html', controller: 'FastTrackController' })
            .when('/fast-track/1-2', { templateUrl: 'partial/fast-track/1-2.html', controller: 'FastTrackController' })
            .when('/fast-track/1-3', { templateUrl: 'partial/fast-track/1-3.html', controller: 'FastTrackController' })
            .when('/fast-track/1-4', { templateUrl: 'partial/fast-track/1-4.html', controller: 'FastTrackController' })
            .when('/fast-track/2-1', { templateUrl: 'partial/fast-track/2-1.html', controller: 'FastTrackController' })
            .when('/fast-track/2-2', { templateUrl: 'partial/fast-track/2-2.html', controller: 'FastTrackController' })
            .when('/fast-track/2-3', { templateUrl: 'partial/fast-track/2-3.html', controller: 'FastTrackController' });
	}])

	.controller('FastTrackController', ['$scope', '$location', 'VideoService',
		function ($scope, $location, videoService) {
		    'use strict';

		    $scope.step = '';
		    $scope.section = '';

		    $scope.$parent.title = $scope.step + " | " + $scope.section;

		    $scope.$watch('step', function () {
		        $scope.$parent.title = $scope.step + ' | ' + $scope.section;
		    });

		    $scope.$watch('section', function () {
		        $scope.$parent.title = $scope.step + ' | ' + $scope.section;
		    });
		}]);
///#source 1 1 /Scripts/generator/controllers/forum.js
angular.module('controllers.forum', [
    'services.video',
    'services.slide',
    'ngRoute'])

	.config(['$routeProvider', function ($routeProvider) {
	    'use strict';

	    $routeProvider
            .when('/forum', { templateUrl: 'partial/forum/index.html', controller: 'ForumController' });
	}])

	.controller('ForumController', ['$scope', '$location', '$window', 'FacebookService', 
		function ($scope, $location, $window, Facebook) {
		    'use strict';

		    $scope.$parent.title = 'Copy Posse On Facebook';

		    $scope.$on('$routeChangeSuccess', function (scope, next, current) {
		        // Redirect if user doesn't have at least 3X VSL permissions
		        if (!$scope.$parent.hasGenerator && !$scope.$parent.hasScriptGenerator) {
		            $location.path('/buy-vsl');
		        }
		    });

		    $scope.showLogin = ((Facebook.authResponse !== null) && (Facebook.authResponse.status !== "connected"));

		    $scope.authResponse = Facebook.authResponse;

		    $scope.permissions = Facebook.permissions;
		    $scope.groupPosts = Facebook.groupPosts;
		    $scope.postMessage = '';
		    $scope.commentBox = '';
		    $scope.currentPost = {};

		    $scope.groupPermission = false;


		    $scope.$on('Facebook:authChange', function (event, response) {
		        $scope.$apply(function () {
		            $scope.authResponse = Facebook.authResponse;
		            $scope.showLogin = (Facebook.authResponse.status !== "connected");

		            // If the user connected, get the posts.
		            if (Facebook.authResponse.status === "connected") {
                        // Get permissions so we know what the user can do.
		                Facebook.getPermissions();
		                $scope.groupPosts = Facebook.getGroup();

		                // get the Facebook groups the user belongs to.
		                Facebook.getUserGroups();
		            } else {
		                $scope.groupPosts = [];
		            }
		        });
		    });

		    $scope.$on('Facebook:postsRetrieved', function (event, response) {
		        console.log(response);
		        $scope.$apply(function () {
                    // Get posts from the group page.
		            $scope.groupPosts = Facebook.groupPosts;
		        });
		    });

		    $scope.$on('Facebook:permissionsReceived', function (event, response) {
		        $scope.$apply(function () {
                    // Add permissions to scope.
		            $scope.permissions = Facebook.permissions;
		        });
		    });

		    $scope.$on('Facebook:postSent', function (event, response) {
		        $scope.$apply(function () {
		            // Add permissions to scope.
		            $scope.postMessage = '';
		        });
		    });

		    $scope.$on('Facebook:postRetrieved', function (event, response) {
		        $scope.$apply(function () {
		            
		        });
		    });

		    $scope.newPost = function () {
		        Facebook.sendPost($scope.postMessage);
		    };

		    $scope.facebookLogin = function () {
		        Facebook.login();
		        return false;
		    };

		    $scope.sendComment = function (post) {
		        Facebook.sendComment(post.id, post.commentBox);
		        post.commentBox = '';
		        $scope.currentPost = post;
		    };

		    $scope.$on('Facebook:commentRetrieved', function (event, response) {
		        $scope.$apply(function () {
		            $('comment_' + $scope.currentPost.id).addClass('in');
		            $scope.currentPost = {};
		        });
		    });

		    $scope.like = function (id) {
		        Facebook.like(id);
		    };

		    $scope.$on('Facebook:likeSent', function (event, response) {
		        if (response && !response.error)
		            toastr.success('Your like has been accepted');
		    });

		    $scope.unLike = function (id) {
		        Facebook.unLike(id);
		    };

		    $scope.$on('Facebook:unLikeSent', function (event, response) {
		        if (response && !response.error)
		            toastr.success('Your unlike has been accepted');
		    });

		    $scope.userLikes = function (post) {
		        var userLikes = false;

		        if (post.likes) {
		            angular.forEach(post.likes.data, function (val, key) {
		                if (val.id === Facebook.authResponse.authResponse.userID)
		                    userLikes = true;
		            });
		        }

		        return userLikes;
		    };

		    $scope.$on('Facebook:groupsReceived', function (event, response) {
		        $scope.$apply(function() {
		            angular.forEach(response.data, function (val, key) {
		                if (val.id === '140985849445361')
		                    $scope.groupPermission = true;
		            });
		        });
		    });

		    var init = function () {
		        if (Facebook.authResponse && (Facebook.authResponse.status === "connected")) {
		            Facebook.getUserGroups();
		            Facebook.getGroup();
		        }
		    };

		    init();
		}]);
///#source 1 1 /Scripts/generator/controllers/generator.js
angular.module('controllers.generator', [
    'services.video',
    'services.slide',
    'directives.characterCount',
    'ngRoute'])

	.config(['$routeProvider', function ($routeProvider) {
	    'use strict';

	    $routeProvider
            .when('/snap-suggestion/pattern-interrupt', { templateUrl: 'partial/snap-suggestion/pattern-interrupt.html', controller: 'GeneratorController' })
            .when('/snap-suggestion/big-promise/watch-now', { templateUrl: 'partial/snap-suggestion/watch-now.html', controller: 'GeneratorController' })
            .when('/snap-suggestion/big-promise/benefit-formula', { templateUrl: 'partial/snap-suggestion/benefit-formula.html', controller: 'GeneratorController' })
            .when('/snap-suggestion/video-scarcity', { templateUrl: 'partial/snap-suggestion/video-scarcity.html', controller: 'GeneratorController' })
            .when('/snap-suggestion/something-different', { templateUrl: 'partial/snap-suggestion/something-different.html', controller: 'GeneratorController' })
            .when('/snap-suggestion/deal', { templateUrl: 'partial/snap-suggestion/deal.html', controller: 'GeneratorController' })

            .when('/vital-connection/modest-introduction', { templateUrl: 'partial/vital-connection/modest-introduction.html', controller: 'GeneratorController' })
            .when('/vital-connection/nightmare-story/overview', { templateUrl: 'partial/vital-connection/nightmare-story/overview.html', controller: 'GeneratorController' })
            .when('/vital-connection/nightmare-story/introduction', { templateUrl: 'partial/vital-connection/nightmare-story/introduction.html', controller: 'GeneratorController' })
            .when('/vital-connection/nightmare-story/bad-part', { templateUrl: 'partial/vital-connection/nightmare-story/bad-part.html', controller: 'GeneratorController' })
            .when('/vital-connection/nightmare-story/really-bad-part', { templateUrl: 'partial/vital-connection/nightmare-story/really-bad-part.html', controller: 'GeneratorController' })
            .when('/vital-connection/nightmare-story/declaration-of-independence', { templateUrl: 'partial/vital-connection/nightmare-story/declaration-of-independence.html', controller: 'GeneratorController' })
            .when('/vital-connection/nightmare-story/moral-journey', { templateUrl: 'partial/vital-connection/nightmare-story/moral-journey.html', controller: 'GeneratorController' })
            .when('/vital-connection/transition-to-big-problem', { templateUrl: 'partial/vital-connection/transition-to-big-problem.html', controller: 'GeneratorController' })
            .when('/vital-connection/about-the-system', { templateUrl: 'partial/vital-connection/about-the-system.html', controller: 'GeneratorController' })
            .when('/vital-connection/results-of-the-system', { templateUrl: 'partial/vital-connection/results-of-the-system.html', controller: 'GeneratorController' })
            .when('/vital-connection/final-transition-phrase', { templateUrl: 'partial/vital-connection/final-transition-phrase.html', controller: 'GeneratorController' })

            .when('/big-problem/conspiracy-cycle/overview', { templateUrl: 'partial/big-problem/conspiracy-cycle/overview.html', controller: 'GeneratorController' })
            .when('/big-problem/conspiracy-cycle/big-lie-transition', { templateUrl: 'partial/big-problem/conspiracy-cycle/big-lie-transition.html', controller: 'GeneratorController' })
            .when('/big-problem/conspiracy-cycle/big-lie-loop', { templateUrl: 'partial/big-problem/conspiracy-cycle/big-lie-loop.html', controller: 'GeneratorController' })
            .when('/big-problem/conspiracy-cycle/not-your-fault', { templateUrl: 'partial/big-problem/conspiracy-cycle/not-your-fault.html', controller: 'GeneratorController' })
            .when('/big-problem/conspiracy-cycle/blame-this', { templateUrl: 'partial/big-problem/conspiracy-cycle/blame-this.html', controller: 'GeneratorController' })
            .when('/big-problem/conspiracy-cycle/big-truth', { templateUrl: 'partial/big-problem/conspiracy-cycle/big-truth.html', controller: 'GeneratorController' })
            .when('/big-problem/open-bigger-solution-loop', { templateUrl: 'partial/big-problem/open-bigger-solution-loop.html', controller: 'GeneratorController' })

            .when('/bigger-solution/open-tip-loop', { templateUrl: 'partial/bigger-solution/open-tip-loop.html', controller: 'GeneratorController' })
            .when('/bigger-solution/the-3-tip-formula-overview', { templateUrl: 'partial/bigger-solution/the-3-tip-formula-overview.html', controller: 'GeneratorController' })
            .when('/bigger-solution/the-avoid-tip', { templateUrl: 'partial/bigger-solution/the-avoid-tip.html', controller: 'GeneratorController' })
            .when('/bigger-solution/the-enjoy-tip', { templateUrl: 'partial/bigger-solution/the-enjoy-tip.html', controller: 'GeneratorController' })
            .when('/bigger-solution/the-how-to-tip', { templateUrl: 'partial/bigger-solution/the-how-to-tip.html', controller: 'GeneratorController' })
            .when('/bigger-solution/transition-into-the-grand-offer', { templateUrl: 'partial/bigger-solution/transition-into-the-grand-offer.html', controller: 'GeneratorController' })

            .when('/grand-offer/product/overview', { templateUrl: 'partial/grand-offer/product/overview.html', controller: 'GeneratorController' })
            .when('/grand-offer/product/usp', { templateUrl: 'partial/grand-offer/product/usp.html', controller: 'GeneratorController' })
            .when('/grand-offer/product/works', { templateUrl: 'partial/grand-offer/product/works.html', controller: 'GeneratorController' })
            .when('/grand-offer/product/what-its-not', { templateUrl: 'partial/grand-offer/product/what-its-not.html', controller: 'GeneratorController' })
            .when('/grand-offer/product/hero-study', { templateUrl: 'partial/grand-offer/product/hero-study.html', controller: 'GeneratorController' })
            .when('/grand-offer/product/hero-study-result', { templateUrl: 'partial/grand-offer/product/hero-study-result.html', controller: 'GeneratorController' })
            .when('/grand-offer/product/out-of-club', { templateUrl: 'partial/grand-offer/product/out-of-club.html', controller: 'GeneratorController' })
            .when('/grand-offer/product/easy-as-it-gets', { templateUrl: 'partial/grand-offer/product/easy-as-it-gets.html', controller: 'GeneratorController' })
            .when('/grand-offer/product/qualify', { templateUrl: 'partial/grand-offer/product/qualify.html', controller: 'GeneratorController' })
            .when('/grand-offer/product/testimonials', { templateUrl: 'partial/grand-offer/product/testimonials.html', controller: 'GeneratorController' })
            .when('/grand-offer/product/whats-in-product', { templateUrl: 'partial/grand-offer/product/whats-in-product.html', controller: 'GeneratorController' })
            .when('/grand-offer/product/emphasize', { templateUrl: 'partial/grand-offer/product/emphasize.html', controller: 'GeneratorController' })
            .when('/grand-offer/product/first-price-tease', { templateUrl: 'partial/grand-offer/product/first-price-tease.html', controller: 'GeneratorController' })
            .when('/grand-offer/product/3-more-benefits', { templateUrl: 'partial/grand-offer/product/3-more-benefits.html', controller: 'GeneratorController' })

            .when('/grand-offer/price/faux-price', { templateUrl: 'partial/grand-offer/price/faux-price.html', controller: 'GeneratorController' })
            .when('/grand-offer/price/bonuses', { templateUrl: 'partial/grand-offer/price/bonuses.html', controller: 'GeneratorController' })
            .when('/grand-offer/price/restate-faux-price', { templateUrl: 'partial/grand-offer/price/restate-faux-price.html', controller: 'GeneratorController' })
            .when('/grand-offer/price/cost-of-loss', { templateUrl: 'partial/grand-offer/price/cost-of-loss.html', controller: 'GeneratorController' })
            .when('/grand-offer/price/discount-reason', { templateUrl: 'partial/grand-offer/price/discount-reason.html', controller: 'GeneratorController' })
            .when('/grand-offer/price/price-drop-down', { templateUrl: 'partial/grand-offer/price/price-drop-down.html', controller: 'GeneratorController' })
            .when('/grand-offer/price/price-reveal', { templateUrl: 'partial/grand-offer/price/price-reveal.html', controller: 'GeneratorController' })
            .when('/grand-offer/price/3x-guarantee', { templateUrl: 'partial/grand-offer/price/3x-guarantee.html', controller: 'GeneratorController' })

            .when('/grand-offer/call-to-action/overview', { templateUrl: 'partial/grand-offer/call-to-action/overview.html', controller: 'GeneratorController' })
            .when('/grand-offer/call-to-action/testimonials', { templateUrl: 'partial/grand-offer/call-to-action/testimonials.html', controller: 'GeneratorController' })
            .when('/grand-offer/call-to-action/super-bonus', { templateUrl: 'partial/grand-offer/call-to-action/super-bonus.html', controller: 'GeneratorController' })
            .when('/grand-offer/call-to-action/inclusion', { templateUrl: 'partial/grand-offer/call-to-action/inclusion.html', controller: 'GeneratorController' })
            .when('/grand-offer/call-to-action/3xcta', { templateUrl: 'partial/grand-offer/call-to-action/3xcta.html', controller: 'GeneratorController' })
            .when('/grand-offer/call-to-action/checkout-process', { templateUrl: 'partial/grand-offer/call-to-action/checkout-process.html', controller: 'GeneratorController' })

            .when('/grand-offer/pain-pleasure/reminder', { templateUrl: 'partial/grand-offer/pain-pleasure/reminder.html', controller: 'GeneratorController' })
            .when('/grand-offer/pain-pleasure/responsibility', { templateUrl: 'partial/grand-offer/pain-pleasure/responsibility.html', controller: 'GeneratorController' })
            .when('/grand-offer/pain-pleasure/reinforce', { templateUrl: 'partial/grand-offer/pain-pleasure/reinforce.html', controller: 'GeneratorController' })

            .when('/grand-offer/actions-results/future-paced', { templateUrl: 'partial/grand-offer/actions-results/future-paced.html', controller: 'GeneratorController' })
            .when('/grand-offer/actions-results/remember-overview', { templateUrl: 'partial/grand-offer/actions-results/remember-overview.html', controller: 'GeneratorController' })
            .when('/grand-offer/actions-results/3-reasons', { templateUrl: 'partial/grand-offer/actions-results/3-reasons.html', controller: 'GeneratorController' })
            .when('/grand-offer/actions-results/smart-thing', { templateUrl: 'partial/grand-offer/actions-results/smart-thing.html', controller: 'GeneratorController' })

            .when('/grand-offer/q-a', { templateUrl: 'partial/grand-offer/q-a.html', controller: 'GeneratorController' });
	}])

	.controller('GeneratorController', ['$scope', '$location', '$filter', 'VideoService', 'SlideService', 'ProjectService',
		function ($scope, $location, $filter, videoService, slideService, projectService) {
		    'use strict';

		    $scope.step = '';
		    $scope.section = '';


		    $scope.$parent.title = $scope.step + " | " + $scope.section;

		    $scope.currentSlide = slideService.currentSlide;







		    $scope.editSlide = slideService.editSlide;
		    $scope.preEdit = {};

		    var sectionSlides = [];

		    var lastSlide = {};

		    var navSlide = {};

		    //var createNewOnSave = (slideService.navSlide.content && (slideService.navSlide.content == '')) ? false : true;
		    var createNewOnSave = true;

		    // save the slide on navigation
		    $scope.$on('$routeChangeStart', function (scope, next, current) {
		        // Revert changes as shown in the slide list on the right.
		        //slideService.currentSlide.content = $scope.preEdit.content;
		        if (slideService.preEdit.id == slideService.currentSlide.id)
		            slideService.currentSlide.content = slideService.preEdit.content;

                // If an edit was requested.
		        if (slideService.editNav && slideService.currentSlide && slideService.currentSlide.content && (slideService.content != '')) {
		            slideService.editSlide = slideService.currentSlide;
		            slideService.currentSlide = {};
		            $scope.currentSlide = {}
		        } else {
                    // No edit, so clear slides.
		            slideService.editSlide = {};
		            slideService.currentSlide = {};
		            $scope.currentSlide = slideService.currentSlide;
		        }
		    });

		    $scope.$on('$routeChangeSuccess', function (scope, next, current) {
                // Redirect if user doesn't have at least 3X VSL permissions
		        if (!$scope.$parent.hasVsl && !$scope.$parent.hasScriptGenerator) {
		            $location.path('/buy-vsl');
		        }

                // Disabled auto save so not needed until re-implemented.
		        // angular.copy(slideService.navSlide, $scope.editSlide);

		        if (slideService.editNav) {
		            slideService.currentSlide = slideService.editSlide;
		            $scope.currentSlide = slideService.editSlide;
		            slideService.editSlide = {};
		            slideService.editNav = false;

		            angular.copy(slideService.currentSlide, slideService.preEdit);
		        }
		    });

		    $scope.$watch('step', function () {
		        $scope.$parent.title = $scope.step + ' | ' + $scope.section;
		    }); 

		    $scope.$watch('section', function () {
		        $scope.$parent.title = $scope.step + ' | ' + $scope.section;
		        $scope.currentSlide = slideService.currentSlide;

                // Send to parent for handling the addition of notes.
		        $scope.$parent.section = $scope.section;

		        if (!$scope.currentSlide.id) {
		            $scope.currentSlide = {
		                section: $scope.section,
		                editUrl: $location.$$path,
		                projectId: projectService.currentProject.id,
		                content: ''
		            };
		        }

		        setSectionSlides();
		    }); 

		    $scope.$on('slidesReset', function () {
		        $scope.currentSlide = slideService.currentSlide;

		        if ($scope.section != '') {
		            if (!$scope.currentSlide.id) {
		                $scope.currentSlide = {
		                    section: $scope.section,
		                    editUrl: $location.$$path,
		                    projectId: projectService.currentProject.id,
		                    content: ''
		                };
		            } else {
		                $scope.currentSlide.content = brToNl($scope.currentSlide.content);
		            }

		            setSectionSlides();
		        }
		    });

		    $scope.$on('slideSaved', function () {
		        $scope.$parent.progress = false;

		        $('#generator-area').focus();

		        // As multiple slides may be affected by a save,
		        // get all the slides again.
		        slideService.getSlides(projectService.currentProject.id);

		        $scope.currentSlide = slideService.currentSlide;
		    });

		    $scope.$on('slideSavedError', function () {
		        $scope.$parent.progress = false;
		    });

		    $scope.$on('redirectSlide', function () {
		        $scope.currentSlide = slideService.currentSlide;
		    });

		    $scope.saveSlide = function () {
		        if ($scope.currentSlide.content && ($scope.currentSlide.content != '')) {
		            $scope.$parent.progress = true;

		            // Using the current slide from the slide service.
		            // we just put into scope for data collection form.
                    // This should alleviate auto save and edit issues.
		            if (!slideService.currentSlide.section)
                        slideService.currentSlide.section = $scope.section;

		            // Determine the slide order.
                    if (!slideService.currentSlide.slideOrder)
                        slideService.currentSlide.slideOrder = getSlideOrder();

		            // Current path is the edit path, if not set. If set, 
                    // we are already on that path.
                    if (!slideService.currentSlide.editUrl)
                        slideService.currentSlide.editUrl = $location.$$path;

                    // Don't cross projects if it already has a project id.
                    if (!slideService.currentSlide.projectId)
                        slideService.currentSlide.projectId = projectService.currentProject.id;
                    
		            // Replace line breaks with <br />
                    slideService.currentSlide.content = nlToBr($scope.currentSlide.content);
                    
                    // Save it in the service
                    slideService.saveSlide();

                    slideService.saveOnNav = true;
		        }
		    };

            // Get the order to set for the slide
		    var getSlideOrder = function () {
                // Only do this if it doesn't already have an order.
		        if (!$scope.currentSlide.slideOrder) {
		            // If there is a previous slide, get it's order and add 1 to return
		            if (slideService.previousSlide.id)
		                return slideService.previousSlide.slideOrder + 1;
		            else if (lastSlide && lastSlide.slideOrder)
		                return lastSlide.slideOrder + 1;
		            else
		                return 1;
		        } else {
		            // Return it's current order.
		            return $scope.currentSlide.slideOrder;
		        }
		    };

		    var setSectionSlides = function () {
		        if ($scope.section != '') {
		            sectionSlides = slideService.getSlidesBySection($scope.section);
		            lastSlide = getLastSlide(sectionSlides);
		        }
		    }

		    var getLastSlide = function (slides) {
		        var filter = $filter('orderBy');

		        var orderedSlides = filter(slides, '+slideOrder');

		        return orderedSlides[orderedSlides.length - 1];
		    };

		    var nlToBr = function (content) {
		        return content.replace(/\n/g, '<br />');
		    };

		    var brToNl = function (content) {
		        return content.replace(/<br\s*\/?>/mg, "\n");
		    };

		}])

    .controller('ModelSlideController', ['$scope', 'SlideService', 'ProjectService', 'dialog', 'title', 'note',
        function ($scope, noteService, projectService, dialog, title, note) {
            $scope.title = title;

            $scope.currentNote = note;

            $scope.SaveNew = function () {
                noteService.saveNote($scope.currentNote);
            };

            $scope.saveClose = function () {
                noteService.saveNote($scope.currentNote);

                $scope.close();
            };

            $scope.$on('noteSaved', function () {
                $('#note-area').focus();

                $scope.currentNote = {
                    noteCategory: "General",
                    projectId: projectService.currentProject.id,
                    userNote: title + " - "
                };
            });

            $scope.close = function () {
                dialog.close();
            };
        }]);
///#source 1 1 /Scripts/generator/controllers/gettingStarted.js
angular.module('controllers.gettingStarted', ['services.download',
    'services.video',
    'ngRoute'])

	.config(['$routeProvider', function ($routeProvider) {
	    'use strict';

	    $routeProvider
            .when('/getting-started/live-coaching', { templateUrl: 'partial/getting-started/live-coaching.html', controller: 'LiveCoachingController' })
            .when('/getting-started/watch-first', { templateUrl: 'partial/getting-started/watch-first.html', controller: 'WatchFirstController' })
            .when('/getting-started/using-generator', { templateUrl: 'partial/getting-started/using-generator.html', controller: 'UsingGeneratorController' })
            .when('/getting-started/toolbox', { templateUrl: 'partial/getting-started/toolbox.html', controller: 'ToolboxController' })
            .when('/getting-started/editing-slides', { templateUrl: 'partial/getting-started/editing-slides.html', controller: 'EditingSlidesController' })
            .when('/getting-started/using-study-tools', { templateUrl: 'partial/getting-started/using-study-tools.html', controller: 'StudyToolsController' })
            .when('/getting-started/downloads', { templateUrl: 'partial/getting-started/downloads.html', controller: 'DownloadsController' });
	}])

    .controller('LiveCoachingController', ['$scope', '$location', '$window', 'VideoService',
		function ($scope, $location, $window, videoService) {
		    'use strict';

		    $scope.$on('$routeChangeSuccess', function (scope, event, current, previous) {
		        if (!$scope.$parent.hasVsl && !$scope.$parent.hasScriptGenerator) {
		            $location.path('/buy-vsl');
		        }

		    });

		    $scope.$parent.title = "Sellerator Live Coaching";

		    $scope.selectedSection = $scope.$parent.selectedSection;

		    $scope.$on('selectSection', function () {
		        $scope.selectedSection = sectionService.selectedSection;
		    });
		}])

    .controller('WatchFirstController', ['$scope', '$location', '$window', 'VideoService',
		function ($scope, $location, $window, videoService) {
		    'use strict';

		    $scope.$on('$routeChangeSuccess', function (scope, event, current, previous) {
		        if (!$scope.$parent.hasVsl && !$scope.$parent.hasScriptGenerator) {
		            $location.path('/buy-vsl');
		        }

		    });

		    $scope.$parent.title = "Getting Started - Watch This First";

		    $scope.selectedSection = $scope.$parent.selectedSection;

		    $scope.$on('selectSection', function () {
		        $scope.selectedSection = sectionService.selectedSection;
		    });
		}])

	.controller('UsingGeneratorController', ['$scope', '$location', '$window', 'VideoService',
		function ($scope, $location, $window, videoService) {
		    'use strict';

		    $scope.$on('$routeChangeSuccess', function (scope, event, current, previous) {
		        if (!$scope.$parent.hasVsl && !$scope.$parent.hasScriptGenerator) {
		            $location.path('/buy-vsl');
		        }

		    });

		    $scope.$parent.title = "Getting Started - Using The Generator";

		    $scope.selectedSection = $scope.$parent.selectedSection;

		    $scope.$on('selectSection', function () {
		        $scope.selectedSection = sectionService.selectedSection;
		    });
		}])

    .controller('EditingSlidesController', ['$scope', '$location', '$window', 'VideoService',
		function ($scope, $location, $window, videoService) {
		    'use strict';

		    $scope.$on('$routeChangeSuccess', function (scope, event, current, previous) {
		        if (!$scope.$parent.hasVsl) {
		            $location.path('/buy-vsl');
		        }

		    });

		    $scope.$parent.title = "Getting Started - Editing Your Slides";

		    $scope.selectedSection = $scope.$parent.selectedSection;

		    $scope.$on('selectSection', function () {
		        $scope.selectedSection = sectionService.selectedSection;
		    });
		}])

	.controller('ToolboxController', ['$scope', '$location', '$window', 'VideoService',
		function ($scope, $location, $window, videoService) {
		    'use strict';

		    $scope.$parent.title = "Getting Started - The 3X VSL Toolbox";

		    $scope.$on('$routeChangeSuccess', function (scope, event, current, previous) {
		        if (!$scope.$parent.hasVsl) {
		            $location.path('/buy-vsl');
		        }

		    });

		    
		}])

	.controller('StudyToolsController', ['$scope', '$location', '$window', 'VideoService',
		function ($scope, $location, $window, videoService) {
		    'use strict';

		    $scope.$on('$routeChangeSuccess', function (scope, event, current, previous) {
		        if (!$scope.$parent.hasVsl) {
		            $location.path('/buy-vsl');
		        }

		    });

		    $scope.$parent.title = "Getting Started - Using The Study Tools";

		    var video = 'using-study-guide.mp4';
		}])

	.controller('DownloadsController', ['$scope', '$location', '$window', 'DownloadService',
		function ($scope, $location, $window, downloadService) {
		    'use strict';

		    $scope.$on('$routeChangeSuccess', function (scope, event, current, previous) {
		        if (!$scope.$parent.hasVsl) {
		            $location.path('/buy-vsl');
		        }

		    });

		    $scope.$parent.title = "Getting Started - Downloads";

		    $scope.secureDownload = function (fileName) {
		        var success = function (response) {
		            return response.secureUrl.trim();
		        };

		        var failure = function (xhr) {
		            toastr.error('Failed to provide secure URL for file ' + $scope.video);
		        };

		        downloadService.get({ 'file': fileName }, success, failure);
		    };
		}]);
///#source 1 1 /Scripts/generator/controllers/login.js
angular.module('controllers.login', [
    'services.user',
    'services.project',
    'services.video',
    'ngRoute'])

	.config(['$routeProvider', function ($routeProvider) {
	    'use strict';

	    $routeProvider
            .when('/login', { templateUrl: 'partial/login.html', controller: 'LoginController' })
            .when('/change-password', { templateUrl: 'partial/change-password.html', controller: 'ChangePasswordController' })
            .when('/forgot-password', { templateUrl: 'partial/forgot-password.html', controller: 'ForgotPasswordController' });
	}])

	.controller('LoginController', ['$scope', '$window', '$location', 'UserService', 'ProjectService', 'VideoService',
		function ($scope, $window, $location, service, projectService, videoService) {
		    'use strict';
		    $scope.$parent.title = 'Login';

		    var parent = $scope.$parent;

		    $scope.email = '';
		    $scope.password = '';
		    $scope.vsl = '';

		    $scope.projects = $scope.$parent.projects;

		    var video = 'GettingStarted.mp4';

		    $scope.sendLogin = function (e) {
		        $scope.$parent.progress = true;

		        //var redirect = (parent.requestedPath === '') ? '/' : parent.requestedPath;
		        var redirect = (parent.requestedPath === '/login') ? '/' : parent.requestedPath;

		        if (projectService.projects.length === 0)
		            projectService.setProject({});

		        var user = { email: $scope.email, password: $scope.password };

		        service.login({ user: user, uuid: $scope.$parent.uuid, vsl: $scope.vsl }, redirect);
		    };

		    $scope.$on('projectsReceived', function () {
		        $scope.projects = projectService.projects;
		    });

		}])

	.controller('ChangePasswordController', ['$scope', '$window', 'UserService',
		function ($scope, $window, service) {
		    'use strict';
		    $scope.$parent.title = 'Change Password';

		    var parent = $scope.$parent;

		    $scope.password = '';
		    $scope.confirmPassword = '';

		    $scope.passwordChanged = false;

		    $scope.sendPasswordChange = function (e) {
		        $scope.$parent.progress = true;

		        var user = JSON.parse(localStorage.getItem('user'));

		        var data = {
		            email: user.email,
		            password: $scope.password,
		            confirmPassword: $scope.confirmPassword
		        };

		        service.changePassword(data);
		    };

		    $scope.$on('passwordChanged', function () {
		        $scope.$parent.progress = false;

		        $scope.passwordChanged = true;
		    });

		    $scope.$on('passwordChangeFailed', function () {
		        $scope.$parent.progress = false;

		        $window.alert(service.error.message);
		    });
		}])

	.controller('ForgotPasswordController', ['$scope', '$window', 'UserService',
		function ($scope, $window, service) {
		    'use strict';
		    $scope.$parent.title = 'Forgot Password';

		    var parent = $scope.$parent;

		    $scope.email = '';
		    $scope.passwordSent = false;
		    $scope.passwordError = null;
            
		    $scope.sendPasswordForgotten = function (e) {
		        $scope.$parent.progress = true;

		        var data = {
		            email: $scope.email
		        };

		        $scope.passwordError = null;

		        service.forgotPassword(data);
		    };

		    $scope.$on('passwordForgottenProcessed', function () {
		        $scope.$parent.progress = false;

		        $scope.passwordSent = true;
		    });

		    $scope.$on('passwordForgottenFailed', function () {
		        $scope.$parent.progress = false;

		        $window.alert(service.error.message);
		    });
		}]);
///#source 1 1 /Scripts/generator/controllers/notepad.js
angular.module('controllers.notepad', [
	'services.video',
	'ngRoute'])

	.config(['$routeProvider', function ($routeProvider) {
		'use strict';

		$routeProvider
			.when('/notepad', { templateUrl: 'partial/notepad/overview.html', controller: 'NotepadOverviewController' })
			//.when('/notepad/:title'.toLowerCase().replace(/\s/g, '-'), { templateUrl: 'partial/notepad/notes.html', controller: 'NotesController' })
			.when('/notepad/usp-factory'.toLowerCase().replace(/\s/g, '-'), { templateUrl: 'partial/notepad/usp-factory.html', controller: 'NotepadUspFactoryController' })
			.when('/notepad/2-stories'.toLowerCase().replace(/\s/g, '-'), { templateUrl: 'partial/notepad/2-stories.html', controller: 'Notepad2StoriesController' })
			.when('/notepad/3-tips'.toLowerCase().replace(/\s/g, '-'), { templateUrl: 'partial/notepad/3-tips.html', controller: 'Notepad3TipsController' })
			.when('/notepad/general'.toLowerCase().replace(/\s/g, '-'), { templateUrl: 'partial/notepad/general.html', controller: 'NotepadGeneralController' });
	}])

	.controller('NotepadOverviewController', ['$scope', '$location', 'VideoService',
		function ($scope, $location, videoService) {
			'use strict';

			$scope.$on('$routeChangeSuccess', function (scope, event, current, previous) {
				if (!$scope.$parent.hasVsl) {
					$location.path('/buy-vsl');
				}

			});

			$scope.$parent.title = 'The 3X VSL Notepad - Overview';
		}])

	.controller('NotesController', ['$scope', '$location', 'ProjectService', 'SectionService', 'NoteService',
		function ($scope, $location, projectService, sectionService, noteService) {
			$scope.$parent.title = 'The 3X VSL Notepad - ' + $scope.$parent.selectedSection.title;

			// save the note on navigation
			$scope.$on('$routeChangeStart', function (scope, next, current) {
				//if (current.controller === 'NotesController')
				//    $scope.saveNote();
			});

			$scope.$on('$routeChangeSuccess', function (scope, event, current, previous) {
				if (!$scope.$parent.hasVsl) {
					$location.path('/buy-vsl');
				}

			});

			$scope.selectedNote = {};

			$scope.$on('changeSection', function () {
				$scope.$parent.title = 'The 3X VSL Notepad - ' + $scope.$parent.selectedSection.title;
			});

			$scope.saveNote = function () {
				var success = function (response) {
					$scope.$parent.progress = false;

					noteService.selectNote(response);

					// Make changes to mainApp.
					$scope.$parent.selectedNote = $scope.selectedNote = {};
					$scope.$parent.notes.push(response);

					$('#notepad').focus();
				};

				var failure = function () {
					$scope.$parent.progress = false;

					toastr.error('Problem saving note');
				};

				$scope.$parent.progress = true;

				$scope.selectedNote.noteCategory = $scope.$parent.selectedProject.title;
				$scope.selectedNote.projectId = $scope.$parent.selectedProject.id;
				toastr.info('Note Saved');

				noteService.resource.save($scope.selectedNote, success, failure);
			};

			var getNextSibling = function (sections) {
				return sections.filter(function (elem, index, array) {
					return elem.order === $scope.$parent.selectedSection.order + 1;
				})[0];
			};

			var getParentNextSibling = function (parentSection, sections) {
				return sections.filter(function (elem, index, array) {
					return elem.order === parentSection.order + 1;
				})[0];
			};

			var getParent = function (parentId) {
				return $scope.$parent.sections.filter(function (elem, index, array) {
					return elem.id === parentId;
				})[0];
			};

			// Navigate to the next section. Sibling if there is one, else next sibling of the parent.
			$scope.nextSection = function () {
				var children = $scope.parentSection.childSections;
				var nextSibling = getNextSibling(children);

				if (nextSibling) {
					$scope.$parent.setCurrentSection(nextSibling);

					$location.path(nextSibling.path);
				} else {
					var masterParent = getParent($scope.parentSection.parentId);
					var parentNextSibling = getParentNextSibling($scope.parentSection, masterParent.childSections);

					$scope.$parent.setCurrentSection(parentNextSibling);
					$location.path(parentNextSibling.path);
				}
			};
		}])
	

	.controller('NotepadUspFactoryController', ['$scope', '$location', 'NoteService', 'ProjectService', 'VideoService',
		function ($scope, $location, noteService, projectService, videoService) {
			'use strict';
			
			$scope.$parent.title = 'The 3X VSL Notepad - USP Factory';

			// save the note on navigation
			$scope.$on('$routeChangeStart', function (scope, next, current) {
				//if (current.controller === 'NotepadUspFactoryController')
				//    $scope.saveNote();
			});

			$scope.$on('$routeChangeSuccess', function (scope, event, current, previous) {
				if (!$scope.$parent.hasVsl) {
					$location.path('/buy-vsl');
				}

			});

			$scope.currentNote = {
				noteCategory: "USP Factory",
				editUrl: $location.$$path,
				projectId: projectService.currentProject.id
			};

			$scope.saveNote = function () {
				$scope.$parent.progress = true;
				
				noteService.saveNote($scope.currentNote);
			};

			$scope.$on('noteSaved', function () {
				$scope.$parent.progress = false;

				$('#note-area').focus();

				//$scope.noteForm.$setPristine();

				$scope.currentNote = {
					noteCategory: "USP Factory",
					editUrl: $location.$$path,
					projectId: projectService.currentProject.id
				};
			});

			$scope.$on('noteSavedError', function () {
				$scope.$parent.progress = false;
			});
		}])


	.controller('Notepad2StoriesController', ['$scope', '$location', 'NoteService', 'ProjectService', 'VideoService',
		function ($scope, $location, noteService, projectService, videoService) {
			'use strict';

			$scope.currentNote = {
				noteCategory: "2 Stories",
				editUrl: $location.$$path,
				projectId: projectService.currentProject.id
			};

			$scope.$parent.title = 'The 3X VSL Notepad - 2 Stories';

			// save the note on navigation
			$scope.$on('$routeChangeStart', function (scope, next, current) {
				//if (current.controller === 'Notepad2StoriesController')
				//    $scope.saveNote();
			});

			$scope.$on('$routeChangeSuccess', function (scope, event, current, previous) {
				if (!$scope.$parent.hasVsl) {
					$location.path('/buy-vsl');
				}

			});

			$scope.saveNote = function () {
				$scope.$parent.progress = true;

				noteService.saveNote($scope.currentNote);
			};

			$scope.$on('noteSaved', function () {
				$scope.$parent.progress = false;

				$('#note-area').focus();

				//$scope.noteForm.$setPristine();

				$scope.currentNote = {
					noteCategory: "2 Stories",
					editUrl: $location.$$path,
					projectId: projectService.currentProject.id
				};
			});

			$scope.$on('noteSavedError', function () {
				$scope.$parent.progress = false;
			});
		}])

	.controller('Notepad3TipsController', ['$scope', '$location', 'NoteService', 'ProjectService', 'VideoService',
		function ($scope, $location, noteService, projectService, videoService) {
			'use strict';

			$scope.$parent.title = 'The 3X VSL Notepad - 3 Tips/4 Comparisons';

			// save the note on navigation
			$scope.$on('$routeChangeStart', function (scope, next, current) {
				//if (current.controller === 'Notepad3TipsController')
				//    $scope.saveNote();
			});

			$scope.$on('$routeChangeSuccess', function (scope, event, current, previous) {
				if (!$scope.$parent.hasVsl) {
					$location.path('/buy-vsl');
				}

			});

			$scope.currentNote = {
				noteCategory: "3 Tips",
				editUrl: $location.$$path,
				projectId: projectService.currentProject.id
			};
			
			$scope.saveNote = function () {
				$scope.$parent.progress = true;

				noteService.saveNote($scope.currentNote);
			};

			$scope.$on('noteSaved', function () {
				$scope.$parent.progress = false;
				$('#note-area').focus();

				//$scope.noteForm.$setPristine();

				$scope.currentNote = {
					noteCategory: "3 Tips",
					editUrl: $location.$$path,
					projectId: projectService.currentProject.id
				};
			});

			$scope.$on('noteSavedError', function () {
				$scope.$parent.progress = false;
			});
		}])

	.controller('NotepadGeneralController', ['$scope', '$location', 'NoteService', 'ProjectService',
		function ($scope, $location, noteService, projectService) {
			'use strict';

			$scope.$parent.title = 'The 3X VSL Notepad - General Notes';

			// save the note on navigation
			$scope.$on('$routeChangeStart', function (scope, next, current) {
				//if (current.controller === 'NotepadGeneralController')
				//    $scope.saveNote();
			});

			$scope.$on('$routeChangeSuccess', function (scope, event, current, previous) {
				if (!$scope.$parent.hasVsl) {
					$location.path('/buy-vsl');
				}

			});

			$scope.currentNote = {
				noteCategory: "General",
				editUrl: $location.$$path,
				projectId: projectService.currentProject.id
			};

			$scope.saveNote = function () {
				$scope.$parent.progress = true;

				noteService.saveNote($scope.currentNote);
			};

			$scope.$on('noteSaved', function () {
				$scope.$parent.progress = false;

				$('#note-area').focus();

				//$scope.noteForm.$setPristine();

				$scope.currentNote = {
					noteCategory: "General",
					editUrl: $location.$$path,
					projectId: projectService.currentProject.id
				};
			});

			$scope.$on('noteSavedError', function () {
				$scope.$parent.progress = false;
			});
		}])

	.controller('ModelNoteController', ['$scope', 'NoteService', 'ProjectService',
		function ($scope, noteService, projectService) {

			$scope.currentNote = noteService.currentNote;

			$scope.SaveNew = function () {
				$scope.$parent.progress = true;

				noteService.saveNote($scope.currentNote);
			};

			$scope.saveClose = function () {
				$scope.$parent.progress = true;

				noteService.saveNote($scope.currentNote);

				$scope.close();
			};

			$scope.$on('noteSaved', function () {
				$scope.$parent.progress = false;

				$('#note-area').focus();

				$scope.currentNote = {
					noteCategory: "General",
					projectId: projectService.currentProject.id,
					userNote: $scope.$parent.title + " - "
				};
			});

			$scope.$on('noteSavedError', function () {
				$scope.$parent.progress = false;
			});

			$scope.close = function () {
				dialog.close();
			};
	}]);
///#source 1 1 /Scripts/generator/controllers/notification.js
angular.module('controllers.notification', [
    'services.notification',
    'ngRoute'
    ])

	.config(['$routeProvider', function ($routeProvider) {
	    'use strict';

	    $routeProvider
            .when('/notifications/:id', { templateUrl: 'partial/notifications/notification.html', controller: 'NotificationController' })
            .when('/notifications', { templateUrl: 'partial/notifications/index.html', controller: 'NotificationController' });
	}])

	.controller('NotificationController', ['$scope', '$location', 'NotificationService',
		function ($scope, $location, service) {
		    'use strict';

		    $scope.$parent.title = 'Notifications';

		    $scope.notifications = service.notifications;
		    $scope.selectedNotification = null;

		    $scope.notificationCount = $scope.notifications.length || 0;

		    $scope.$on('userNotificationsRetrieved', function () {
		        $scope.$parent.progress = false;

		        $scope.notifications = service.notifications;
		    });

		    $scope.$on('userNotificationsRetrievedFailed', function () {
		        $scope.$parent.progress = false;
		    });

		    $scope.getNotifications = function () {
		        $scope.$parent.progress = true;

		        service.getUserNotifications($scope.$parent.user);
		    };

		    $scope.getNotification = function (id) {
		        $scope.$parent.progress = true;

		    };

		    $scope.getNotifications();
		}]);
///#source 1 1 /Scripts/generator/controllers/produce.js
angular.module('controllers.produce', [
    'services.video',
    'services.slide',
    'ngRoute'])

	.config(['$routeProvider', function ($routeProvider) {
	    'use strict';

	    $routeProvider
            .when('/produce/tonality', { templateUrl: 'partial/produce/tonality.html', controller: 'ProduceController' })
            .when('/produce/using-screenflow', { templateUrl: 'partial/produce/using-screenflow.html', controller: 'ProduceController' })
            .when('/produce/screenflow-split', { templateUrl: 'partial/produce/screenflow-split.html', controller: 'ProduceController' })
            .when('/produce/using-camtasia', { templateUrl: 'partial/produce/using-camtasia.html', controller: 'ProduceController' })
            .when('/produce/camtasia-split', { templateUrl: 'partial/produce/camtasia-split.html', controller: 'ProduceController' })
            .when('/produce/magic-buy-button', { templateUrl: 'partial/produce/magic-buy-button.html', controller: 'ProduceController' })
            .when('/produce/advanced-magic-buy-button', { templateUrl: 'partial/produce/advanced-magic-buy-button.html', controller: 'ProduceController' })
            .when('/produce/evp', { templateUrl: 'partial/produce/evp.html', controller: 'ProduceController' })
            .when('/produce/compression', { templateUrl: 'partial/produce/compression.html', controller: 'ProduceController' })
            .when('/produce/changing-fonts', { templateUrl: 'partial/produce/changing-fonts.html', controller: 'ProduceController' });
	}])

	.controller('ProduceController', ['$scope', '$location', 'VideoService', 
		function ($scope, $location, videoService) {
		    'use strict';

		    $scope.$on('$routeChangeSuccess', function (scope, event, current, previous) {
		        if (!$scope.$parent.hasVsl) {
		            $location.path('/buy-vsl');
		        }

		    });

		    $scope.step = '';
		    $scope.section = '';

		    $scope.$parent.title = $scope.step + " | " + $scope.section;

		    $scope.$watch('step', function () {
		        $scope.$parent.title = $scope.step + ' | ' + $scope.section;
		    });

		    $scope.$watch('section', function () {
		        $scope.$parent.title = $scope.step + ' | ' + $scope.section;
		    });
            		   

		}]);
///#source 1 1 /Scripts/generator/controllers/productCreation.js
angular.module('controllers.pcf', [
    'services.video',
    'services.slide',
    'ngRoute'])

	.config(['$routeProvider', function ($routeProvider) {
	    'use strict';

	    $routeProvider
            .when('/product-creation-formula/week-1', { templateUrl: 'partial/product-creation-formula/week-1.html', controller: 'ProductCreationController' })
            .when('/product-creation-formula/week-2', { templateUrl: 'partial/product-creation-formula/week-2.html', controller: 'ProductCreationController' })
            .when('/product-creation-formula/week-3', { templateUrl: 'partial/product-creation-formula/week-3.html', controller: 'ProductCreationController' })
            .when('/product-creation-formula/week-4', { templateUrl: 'partial/product-creation-formula/week-4.html', controller: 'ProductCreationController' });
	}])

	.controller('ProductCreationController', ['$scope', '$location',
		function ($scope, $location) {
		    'use strict';

		    $scope.week = '';

		    $scope.$parent.title = '28 Day Product Creation Formula | Week ' + $scope.week;

		    $scope.$on('$routeChangeSuccess', function (scope, next, current) {
		        // Redirect if user doesn't have at least 3X VSL permissions
		        if (!$scope.$parent.hasPcf) { 
		            $location.path('/buy-vsl');
		        }
		    });

		    $scope.$watch('week', function () {
		        $scope.$parent.title = '28 Day Product Creation Formula | Week ' + $scope.week;
		    });
		}]);
///#source 1 1 /Scripts/generator/controllers/project.js
angular.module('controllers.project', [
    'services.project',
    'ngRoute'])

	.config(['$routeProvider',
        function ($routeProvider) {
	        'use strict';

            $routeProvider
                .when('/projects', { templateUrl: 'partial/projects/index.html', controller: 'ListProjectController' })
                .when('/project/save', { templateUrl: 'partial/saveProject.html', controller: 'SaveProjectController' })
                .when('/copy-project/:id', { templateUrl: 'partial/saveProject.html', controller: 'CopyProjectController' });
        }])

	.controller('SaveProjectController', ['$scope', '$location', '$templateCache', 'ProjectService', 'UserService',
		function ($scope, $location, $templateCache, service, userService) {
		    'use strict';

		    $scope.$on('$routeChangeSuccess', function (scope, event, current, previous) {
		        if (!$scope.$parent.hasVsl && !$scope.$parent.hasScriptGenerator) {
		            $location.path('/buy-vsl');
		        }

		    });

		    $scope.$parent.title = 'Create A New Project';

		    $scope.projectRequired = false;

		    $scope.saveProject = function (e) {
		        var project = {
		            userId: userService.user.accountId,
		            title: $scope.projectTitle
		        };

		        service.saveProject(project);
		    };

		    // When project saved, redirect to start page for projects.
		    $scope.$on('projectSaved', function () {
		        var required = $scope.projectRequired;

		        if ($scope.$parent.requestedPath != '') {
		            var location = $scope.$parent.requestedPath;

		            $scope.$parent.projectRequired = $scope.projectRequired = false;

		            $location.path(location);
		        }

		        if ($scope.$parent.hasVsl)
		            $location.path('/getting-started/toolbox');
		        else
		            $location.path('/getting-started/using-generator');

		    });

		    $scope.$on('projectsReceived', function () {
		        $scope.projectRequired = service.projects.length === 0;
		    });

		    $templateCache.removeAll();
		}])

	.controller('CopyProjectController', ['$scope', '$routeParams', '$location', '$templateCache', 'ProjectService', 'UserService',
		function ($scope, $routeParams, $location, $templateCache, service, userService) {
		    'use strict';

		    $scope.$on('$routeChangeSuccess', function (scope, event, current, previous) {
		        if (!$scope.$parent.hasVsl && !$scope.$parent.hasScriptGenerator) {
		            $location.path('/buy-vsl');
		        }

		    });

		    $scope.$parent.title = 'Copy A Project';

		    $scope.projectTitle = '';

		    $scope.saveProject = function (e) {
		        var project = {
		            userId: userService.user.accountId,
		            title: $scope.projectTitle
		        };

		        $scope.$parent.projectRequired = $scope.projectRequired = false;

		        service.saveCopy(project, $routeParams.id);
		    };

		    // When project saved, redirect to start page for projects.
		    $scope.$on('projectSaved', function () {
		        var required = $scope.projectRequired;

		        if ($scope.$parent.requestedPath != '') {
		            var location = $scope.$parent.requestedPath;

		            $scope.$parent.projectRequired = $scope.projectRequired = false;

		            $location.path(location);
		        }

		        $location.path('/getting-started/toolbox');

		    });

		    // When project saved, redirect to start page for projects.
		    $scope.$on('projectRetrieved', function () {
		        var copy = angular.copy(service.copyProject);

		        $scope.projectTitle = copy.title + ' (copy)';

		    });

		    $scope.projectRequired = $scope.$parent.projectRequired;

		    var init = function () {
		        console.log($routeParams.id);
		        service.getProject($routeParams.id);
		    };

		    init();

		    $templateCache.removeAll();
		}])

	.controller('ListProjectController', ['$scope', '$routeParams', '$location', '$templateCache', 'ProjectService', 'UserService',
		function ($scope, $routeParams, $location, $templateCache, service, userService) {
		    'use strict';

		    $scope.$parent.title = 'Projects';
		}]);
///#source 1 1 /Scripts/generator/controllers/shortForm.js
angular.module('controllers.shortForm', [
    'services.video',
    'services.slide',
    'ngRoute'])

	.config(['$routeProvider', function ($routeProvider) {
	    'use strict';

	    $routeProvider
            .when('/short-form/1-minute', { templateUrl: 'partial/short-form/1-minute.html', controller: 'ShortFormController' })
            .when('/short-form/5-minute', { templateUrl: 'partial/short-form/5-minute.html', controller: 'ShortFormController' })
            .when('/short-form/20-minute', { templateUrl: 'partial/short-form/20-minute.html', controller: 'ShortFormController' });
	}])

	.controller('ShortFormController', ['$scope', '$location',
		function ($scope, $location) {
		    'use strict';

		    $scope.time = '';

		    $scope.$parent.title = 'Short Form VSL Formula | ' + $scope.time + ' Minute VSL Formula';

		    $scope.$on('$routeChangeSuccess', function (scope, next, current) {
		        // Redirect if user doesn't have at least 3X VSL permissions
		        if (!$scope.$parent.hasGenerator) {
		            if (!$scope.$parent.has20Min) 
		                $location.path('/buy-vsl');
		        }
		    });

		    $scope.$watch('week', function () {
		        $scope.$parent.title = 'Short Form VSL Formula | ' + $scope.time + ' Minute VSL Formula';
		    });
		}]);
///#source 1 1 /Scripts/generator/controllers/snapSuggestion.js
angular.module('controllers.snapSuggestion', [
    'services.video',
    'ngRoute'])

	.config(['$routeProvider', function ($routeProvider) {
	    'use strict';

	    $routeProvider
            //.when('/notepad/:title'.toLowerCase().replace(/\s/g, '-'), { templateUrl: 'partial/notepad/notes.html', controller: 'NotesController' })
            //.when('/notepad/usp-factory'.toLowerCase().replace(/\s/g, '-'), { templateUrl: 'partial/notepad/usp-factory.html', controller: 'NotepadUspFactoryController' })
            //.when('/notepad/2-stories'.toLowerCase().replace(/\s/g, '-'), { templateUrl: 'partial/notepad/2-stories.html', controller: 'Notepad2StoriesController' })
            //.when('/notepad/3-tips'.toLowerCase().replace(/\s/g, '-'), { templateUrl: 'partial/notepad/3-tips.html', controller: 'Notepad3TipsController' })
            .when('/snap-suggestion/pattern-interrupt', { templateUrl: 'partial/snap-suggestion/pattern-interrupt.html', controller: 'SnapSuggestionController' });
	}])

	.controller('SnapSuggestionController', ['$scope', '$location', 'VideoService',
		function ($scope, $location, videoService) {
		    'use strict';

		    $scope.$on('$routeChangeSuccess', function (scope, event, current, previous) {
		        if (!$scope.$parent.hasVsl) {
		            $location.path('/buy-vsl');
		        }

		    });

		    $scope.$parent.title = 'The 3X VSL Notepad - Overview';
		}])

    .controller('NotesController', ['$scope', '$location', 'ProjectService', 'SectionService', 'NoteService',
        function ($scope, $location, projectService, sectionService, noteService) {
            $scope.$parent.title = 'The 3X VSL Notepad - ' + $scope.$parent.selectedSection.title;

            $scope.$on('$routeChangeSuccess', function (scope, event, current, previous) {
                if (!$scope.$parent.hasVsl) {
                    $location.path('/buy-vsl');
                }

            });

            $scope.selectedNote = {};

            $scope.$on('changeSection', function () {
                $scope.$parent.title = 'The 3X VSL Notepad - ' + $scope.$parent.selectedSection.title;
            });

            $scope.saveNote = function () {
                var success = function (response) {
                    noteService.selectNote(response);

                    // Make changes to mainApp.
                    $scope.$parent.selectedNote = $scope.selectedNote = {};
                    $scope.$parent.notes.push(response);

                    $('#notepad').focus();
                };

                var failure = function () {
                    toastr.error('Problem saving note');
                };

                $scope.selectedNote.noteCategory = $scope.$parent.selectedProject.title;
                $scope.selectedNote.projectId = $scope.$parent.selectedProject.id;
                toastr.info('Note Saved');

                noteService.resource.save($scope.selectedNote, success, failure);
            };

            var getNextSibling = function (sections) {
                return sections.filter(function (elem, index, array) {
                    return elem.order == $scope.$parent.selectedSection.order + 1;
                })[0];
            };

            var getParentNextSibling = function (parentSection, sections) {
                return sections.filter(function (elem, index, array) {
                    return elem.order == parentSection.order + 1;
                })[0];
            };

            var getParent = function (parentId) {
                return $scope.$parent.sections.filter(function (elem, index, array) {
                    return elem.id == parentId;
                })[0];
            };

            // Navigate to the next section. Sibling if there is one, else next sibling of the parent.
            $scope.nextSection = function () {
                var children = $scope.parentSection.childSections;
                var nextSibling = getNextSibling(children);

                if (nextSibling) {
                    $scope.$parent.setCurrentSection(nextSibling);

                    $location.path(nextSibling.path);
                } else {
                    var masterParent = getParent($scope.parentSection.parentId);
                    var parentNextSibling = getParentNextSibling($scope.parentSection, masterParent.childSections);

                    $scope.$parent.setCurrentSection(parentNextSibling);
                    $location.path(parentNextSibling.path);
                }
            };
        }])


    .controller('NotepadUspFactoryController', ['$scope', '$location', 'NoteService',
		function ($scope, $location, noteService) {
		    'use strict';

		    $scope.$on('$routeChangeSuccess', function (scope, event, current, previous) {
		        if (!$scope.$parent.hasVsl) {
		            $location.path('/buy-vsl');
		        }

		    });

		    $scope.selectedProject = $scope.$parent.selectedProject;

		    $scope.selectedNote = {};

		    $scope.$parent.title = 'The 3X VSL Notepad - USP Factory';

		    $scope.selectedNote = {
		        noteCategory: "USP Factory",
		        editUrl: $location.$$path
		    };

		    $scope.saveNote = function () {
		        var success = function (response) {
		            noteService.selectNote(response);

		            // Make changes to mainApp.
		            $scope.$parent.selectedNote = $scope.selectedNote = {
		                noteCategory: "USP Factory",
		                editUrl: $location.$$path
		            };
		            $scope.$parent.notes.push(response);

		            $scope.$parent.resetNotes();

		            $('#notepad').focus();
		            toastr.success('Note Saved');
		        };

		        var failure = function () {
		            toastr.error('Problem saving note');
		        };

		        $scope.selectedNote.projectId = $scope.$parent.selectedProject.id;

		        noteService.resource.save($scope.selectedNote, success, failure);
		    };
		}])


    .controller('Notepad2StoriesController', ['$scope', '$location', 'NoteService',
		function ($scope, $location, noteService) {
		    'use strict';

		    $scope.$on('$routeChangeSuccess', function (scope, event, current, previous) {
		        if (!$scope.$parent.hasVsl) {
		            $location.path('/buy-vsl');
		        }

		    });

		    $scope.selectedProject = $scope.$parent.selectedProject;

		    $scope.selectedNote = {
		        noteCategory: "2 Stories",
		        editUrl: $location.$$path
		    };

		    $scope.$parent.title = 'The 3X VSL Notepad - 2 Stories';

		    $scope.noteCategory = "2 Stories";

		    $scope.saveNote = function () {
		        var success = function (response) {
		            noteService.selectNote(response);

		            // Make changes to mainApp.
		            $scope.$parent.selectedNote = $scope.selectedNote = {
		                noteCategory: "2 Stories",
		                editUrl: $location.$$path
		            };
		            $scope.$parent.notes.push(response);

		            $('#notepad').focus();
		            toastr.success('Note Saved');

		            $scope.$parent.resetNotes();
		        };

		        var failure = function () {
		            toastr.error('Problem saving note');
		        };

		        $scope.selectedNote.projectId = $scope.$parent.selectedProject.id;

		        noteService.resource.save($scope.selectedNote, success, failure);
		    };
		}])

    .controller('Notepad3TipsController', ['$scope', '$location', 'NoteService',
		function ($scope, $location, noteService) {
		    'use strict';

		    $scope.$on('$routeChangeSuccess', function (scope, event, current, previous) {
		        if (!$scope.$parent.hasVsl) {
		            $location.path('/buy-vsl');
		        }

		    });

		    $scope.selectedProject = $scope.$parent.selectedProject;

		    $scope.selectedNote = {};

		    $scope.$parent.title = 'The 3X VSL Notepad - 3 Tips/4 Comparisons';

		    $scope.selectedNote = {
		        noteCategory: "3 Tips",
		        editUrl: $location.$$path
		    };

		    $scope.saveNote = function () {
		        var success = function (response) {
		            noteService.selectNote(response);

		            // Make changes to mainApp.
		            $scope.$parent.selectedNote = $scope.selectedNote = {
		                noteCategory: "3 Tips",
		                editUrl: $location.$$path
		            };
		            $scope.$parent.notes.push(response);

		            $('#notepad').focus();
		            toastr.success('Note Saved');

		            $scope.$parent.resetNotes();
		        };

		        var failure = function () {
		            toastr.error('Problem saving note');
		        };

		        $scope.selectedNote.projectId = $scope.$parent.selectedProject.id;

		        noteService.resource.save($scope.selectedNote, success, failure);
		    };
		}])

    .controller('NotepadGeneralController', ['$scope', '$location', 'NoteService',
		function ($scope, $location, noteService) {
		    'use strict';

		    $scope.$on('$routeChangeSuccess', function (scope, event, current, previous) {
		        if (!$scope.$parent.hasVsl) {
		            $location.path('/buy-vsl');
		        }

		    });

		    $scope.selectedProject = $scope.$parent.selectedProject;

		    $scope.selectedNote = {};

		    $scope.$parent.title = 'The 3X VSL Notepad - General Notes';

		    $scope.selectedNote = {
		        noteCategory: "General",
		        editUrl: $location.$$path
		    };

		    $scope.saveNote = function () {
		        var success = function (response) {
		            noteService.selectNote(response);

		            // Make changes to mainApp.
		            $scope.$parent.selectedNote = $scope.selectedNote = {
		                noteCategory: "General",
		                editUrl: $location.$$path
		            };
		            $scope.$parent.notes.push(response);

		            $('#notepad').focus();
		            toastr.success('Note Saved');

		            $scope.$parent.resetNotes();
		        };

		        var failure = function () {
		            toastr.error('Problem saving note');
		        };

		        $scope.selectedNote.projectId = $scope.$parent.selectedProject.id;

		        noteService.resource.save($scope.selectedNote, success, failure);
		    };
		}]);
///#source 1 1 /Scripts/generator/controllers/spf.js
angular.module('controllers.spf', ['ngRoute'])

	.config(['$routeProvider', function ($routeProvider) {
	    'use strict';

	    $routeProvider
            .when('/spf', { templateUrl: 'partial/spf.html', controller: 'SpfController' });
	}])

	.controller('SpfController', ['$scope', '$location',
		function ($scope, $location) {
		    'use strict';

		    $scope.$parent.title = 'Sales Letter Formula';
		}]);
///#source 1 1 /Scripts/generator/controllers/support.js
angular.module('controllers.support', [
    'services.video',
    'services.slide',
    'ngRoute'])

	.config(['$routeProvider', function ($routeProvider) {
	    'use strict';

	    $routeProvider
            .when('/support', { templateUrl: 'partial/support.html', controller: 'SupportController' });
	}])

	.controller('SupportController', ['$scope', '$location', 'VideoService',
		function ($scope, $location, videoService) {
		    'use strict';

		    $scope.$parent.title = 'Support';
		}]);
///#source 1 1 /Scripts/generator/controllers/trafficPros.js
angular.module('controllers.traffic', [
    'services.video',
    'services.slide',
    'ngRoute'])

	.config(['$routeProvider', function ($routeProvider) {
	    'use strict';

	    $routeProvider
            .when('/traffic/issue-1', { templateUrl: 'partial/traffic/issue-1.html', controller: 'TrafficProsController' })
            .when('/traffic/issue-2', { templateUrl: 'partial/traffic/issue-2.html', controller: 'TrafficProsController' })
            .when('/traffic/issue-3', { templateUrl: 'partial/traffic/issue-3.html', controller: 'TrafficProsController' })
            .when('/traffic/issue-4', { templateUrl: 'partial/traffic/issue-4.html', controller: 'TrafficProsController' })
            .when('/traffic/issue-5', { templateUrl: 'partial/traffic/issue-5.html', controller: 'TrafficProsController' })
            .when('/traffic/issue-6', { templateUrl: 'partial/traffic/issue-6.html', controller: 'TrafficProsController' })
            .when('/traffic/issue-7', { templateUrl: 'partial/traffic/issue-7.html', controller: 'TrafficProsController' })
            .when('/traffic/issue-8', { templateUrl: 'partial/traffic/issue-8.html', controller: 'TrafficProsController' })
            .when('/traffic/issue-9', { templateUrl: 'partial/traffic/issue-9.html', controller: 'TrafficProsController' })
            .when('/traffic/issue-10', { templateUrl: 'partial/traffic/issue-10.html', controller: 'TrafficProsController' })
            .when('/traffic/issue-11', { templateUrl: 'partial/traffic/issue-11.html', controller: 'TrafficProsController' })
            .when('/traffic/issue-12', { templateUrl: 'partial/traffic/issue-12.html', controller: 'TrafficProsController' })
            .when('/traffic/issue-13', { templateUrl: 'partial/traffic/issue-13.html', controller: 'TrafficProsController' });
	}])

	.controller('TrafficProsController', ['$scope', '$location',
		function ($scope, $location) {
		    'use strict';

		    $scope.month = '';
		    $scope.person = '';

		    $scope.$parent.title = $scope.month + ': ' + $scope.person;

		    $scope.$watch('month', function () {
		        $scope.$parent.title = $scope.month + ': ' + $scope.person;
		    });
		}]);
///#source 1 1 /Scripts/generator/controllers/user.js
angular.module('controllers.user', [
    'services.user',
    'services.project',
    'services.video',
    'ngRoute'])

	.config(['$routeProvider', function ($routeProvider) {
	    'use strict';

	    $routeProvider
            .when('/login', { templateUrl: 'partial/login.html', controller: 'LoginController' })
            .when('/change-password', { templateUrl: 'partial/change-password.html', controller: 'ChangePasswordController' })
            .when('/forgot-password', { templateUrl: 'partial/forgot-password.html', controller: 'ForgotPasswordController' });
	}])

	.controller('LoginController', ['$scope', '$window', '$location', 'UserService', 'ProjectService', 'VideoService',
		function ($scope, $window, $location, service, projectService, videoService) {
		    'use strict';
		    $scope.$parent.title = 'Login';

		    var parent = $scope.$parent;

		    $scope.email = '';
		    $scope.password = '';
		    $scope.vsl = '';

		    $scope.projects = $scope.$parent.projects;

		    var video = 'GettingStarted.mp4';

		    $scope.sendLogin = function (e) {
		        $scope.$parent.progress = true;

		        var redirect = (parent.requestedPath === '') ? '/' : parent.requestedPath;
		        var redirect = (parent.requestedPath === '/login') ? '/' : parent.requestedPath;

		        if (projectService.projects.length == 0)
		            projectService.setProject({});

                // Hide here while trying out new login
		        //var user = { email: $scope.email, password: $scope.password };
		        var user = { userName: $scope.email, password: $scope.password };
		        service.login({ user: user, uuid: $scope.$parent.uuid, vsl: $scope.vsl }, redirect);
		    };

		    $scope.$on('projectsReceived', function () {
		        $scope.projects = projectService.projects;
		    });

		}])

	.controller('ChangePasswordController', ['$scope', '$window', 'UserService',
		function ($scope, $window, service) {
		    'use strict';
		    $scope.$parent.title = 'Change Password';

		    var parent = $scope.$parent;

		    $scope.password = '';
		    $scope.confirmPassword = '';

		    $scope.passwordChanged = false;

		    $scope.sendPasswordChange = function (e) {
		        $scope.$parent.progress = true;

		        var user = JSON.parse(localStorage.getItem('user'));

		        var data = {
		            email: user.email,
		            password: $scope.password,
		            confirmPassword: $scope.confirmPassword
		        };

		        service.changePassword(data);
		    };

		    $scope.$on('passwordChanged', function () {
		        $scope.$parent.progress = false;

		        $scope.passwordChanged = true;
		    });

		    $scope.$on('passwordChangeFailed', function () {
		        $scope.$parent.progress = false;

		        $window.alert(service.error.message);
		    });
		}])

	.controller('ForgotPasswordController', ['$scope', '$window', 'UserService',
		function ($scope, $window, service) {
		    'use strict';
		    $scope.$parent.title = 'Forgot Password';

		    var parent = $scope.$parent;

		    $scope.email = '';
		    $scope.passwordSent = false;
		    $scope.passwordError = null;

		    $scope.sendPasswordForgotten = function (e) {
		        $scope.$parent.progress = true;

		        var data = {
		            email: $scope.email
		        };

		        $scope.passwordError = null;

		        service.forgotPassword(data);
		    };

		    $scope.$on('passwordForgottenProcessed', function () {
		        $scope.$parent.progress = false;

		        $scope.passwordSent = true;
		    });

		    $scope.$on('passwordForgottenFailed', function () {
		        $scope.$parent.progress = false;

		        $window.alert(service.error.message);
		    });
		}]);
